import { toCsv } from "@/lib/csv";

export type ImportType = "leads" | "claims";

export function normalizeImportType(value: unknown): ImportType | undefined {
  if (value === "leads" || value === "claims") return value;
  return undefined;
}

export function hasUsableCsvRows(records: Record<string, string>[]) {
  return records.some((record) => Object.values(record).some((value) => value?.toString().trim().length > 0));
}

export function importTemplateCsv(type: ImportType) {
  if (type === "leads") {
    return toCsv(
      [
        "firstName",
        "lastName",
        "email",
        "phone",
        "address1",
        "city",
        "state",
        "postalCode",
        "source",
        "referralSource",
        "lossType",
        "dateOfLoss",
        "followUpDate",
        "notes",
      ],
      [["Jamie", "Cole", "jamie@example.com", "(813) 555-0123", "120 Bay Street", "Tampa", "FL", "33602", "Past client", "Neighbor referral", "Water damage", "2026-05-01", "2026-05-05", "Call after 4 PM"]],
    );
  }

  return toCsv(
    [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address1",
      "city",
      "state",
      "postalCode",
      "carrierName",
      "policyNumber",
      "claimNumber",
      "lossType",
      "dateOfLoss",
    ],
    [["Jordan", "Miles", "jordan@example.com", "(727) 555-0199", "88 Harbor Drive", "St. Petersburg", "FL", "33701", "Sun State Insurance", "SSI-HO-22931", "SSI-26-00452", "Wind / roof leak", "2026-04-28"]],
  );
}
