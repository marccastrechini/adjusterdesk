import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import { cleanFileName, resolveStoredUploadPath } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

function notFoundResponse() {
  return NextResponse.json({ error: "Document not found." }, { status: 404 });
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

function safeDownloadName(fileName?: string | null, title?: string | null) {
  const name = cleanFileName(fileName || title || "document") || "document";
  return name;
}

export async function GET(_request: Request, context: RouteContext) {
  const authContext = await getAuthenticatedAppContext();
  if (!authContext) {
    return unauthorizedResponse();
  }

  const { firm } = authContext;
  const { id } = await context.params;

  const document = await prisma.document.findFirst({
    where: { id, firmId: firm.id },
    select: {
      filePath: true,
      fileName: true,
      title: true,
      mimeType: true,
    },
  });

  if (!document?.filePath) return notFoundResponse();

  const absolutePath = resolveStoredUploadPath(document.filePath);
  if (!absolutePath) return notFoundResponse();

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(absolutePath);
  } catch {
    return notFoundResponse();
  }

  const downloadName = safeDownloadName(document.fileName, document.title);
  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "content-type": document.mimeType || "application/octet-stream",
      "content-disposition": `attachment; filename="${downloadName}"`,
      "x-content-type-options": "nosniff",
    },
  });
}
