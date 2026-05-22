import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadRoot = path.join(process.cwd(), "storage", "uploads");

function cleanFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function saveUploadedFile(file: File) {
  await mkdir(uploadRoot, { recursive: true });

  const safeName = cleanFileName(file.name || "upload.bin");
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
