import { SpreadsheetImportPage } from "@/components/spreadsheet-import-page";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartImportPage({ searchParams }: PageProps) {
  return <SpreadsheetImportPage searchParams={await searchParams} returnPath="/start/import" />;
}