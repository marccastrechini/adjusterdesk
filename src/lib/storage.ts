import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadRoot = path.join(process.cwd(), "storage", "uploads");
const uploadPrefix = "storage/uploads/";
const blockedUploadExtensions = new Set([
  ".app",
  ".appimage",
  ".bat",
  ".cmd",
  ".com",
  ".cpl",
  ".exe",
  ".jar",
  ".js",
  ".jse",
  ".lnk",
  ".msi",
  ".msc",
  ".ps1",
  ".psm1",
  ".reg",
  ".scr",
  ".sh",
  ".vbe",
  ".vbs",
  ".wsf",
  ".wsh",
]);

export const maxUploadSizeBytes = 25 * 1024 * 1024;

function extensionFromName(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) return "";
  return normalized.slice(index);
}

export function cleanFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function validateUploadFile(file: File) {
  if (file.size <= 0) return "Choose a file to upload.";
  if (file.size > maxUploadSizeBytes) return "File is too large. Use a file up to 25 MB.";

  const extension = extensionFromName(file.name);
  if (extension && blockedUploadExtensions.has(extension)) {
    return "That file type is not allowed for upload.";
  }

  return undefined;
}

export function resolveStoredUploadPath(filePath: string) {
  const normalized = filePath.replaceAll("\\", "/");
  if (!normalized.startsWith(uploadPrefix)) return undefined;

  const absolutePath = path.resolve(process.cwd(), normalized);
  const rootPath = path.resolve(uploadRoot);
  const withinRoot = absolutePath === rootPath || absolutePath.startsWith(`${rootPath}${path.sep}`);
  if (!withinRoot) return undefined;

  return absolutePath;
}

export async function saveUploadedFile(file: File) {
  const fileError = validateUploadFile(file);
  if (fileError) throw new Error(fileError);

  await mkdir(uploadRoot, { recursive: true });

  const safeName = cleanFileName(file.name || "upload.bin") || "upload.bin";
  const storedName = `${Date.now()}-${safeName}`;
  const absolutePath = path.join(uploadRoot, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, buffer);

  return {
    fileName: file.name,
    filePath: path.join("storage", "uploads", storedName).replaceAll("\\", "/"),
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buffer.length,
  };
}
