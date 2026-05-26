import { NextResponse } from "next/server";
import { importTemplateCsv, normalizeImportType } from "@/lib/import-utils";

type RouteContext = { params: Promise<{ type: string }> };

export const dynamic = "force-dynamic";

function csvResponse(fileName: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { type } = await context.params;
  const normalizedType = normalizeImportType(type);
  if (!normalizedType) {
    return NextResponse.json({ error: "Unknown template type" }, { status: 404 });
  }

  const csv = importTemplateCsv(normalizedType);
  return csvResponse(`adjusterdesk-${normalizedType}-sample.csv`, csv);
}
