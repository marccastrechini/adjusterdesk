import { parse } from "csv-parse/sync";
import { toCsv } from "@/lib/csv";

export type ImportType = "leads" | "claims";

export type ImportFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "address1"
  | "city"
  | "state"
  | "postalCode"
  | "source"
  | "referralSource"
  | "carrierName"
  | "policyNumber"
  | "claimNumber"
  | "lossType"
  | "dateOfLoss"
  | "reportedDate"
  | "inspectionDate"
  | "deadlineDate"
  | "followUpDate"
  | "notes";

export type ImportRowValues = Partial<Record<ImportFieldKey, string>>;

export type ImportPreviewRow = {
  rowNumber: number;
  values: ImportRowValues;
  errors: string[];
};

export type ImportPreview = {
  importType: ImportType;
  rows: ImportPreviewRow[];
  missingColumns: string[];
  validCount: number;
  invalidCount: number;
};

type FieldDefinition = {
  key: ImportFieldKey;
  label: string;
  aliases: string[];
};

type ParseOptions = {
  existingClaimNumbers?: string[];
};

const fieldDefinitions: FieldDefinition[] = [
  { key: "firstName", label: "First name", aliases: ["firstName", "First Name", "Client First Name", "First"] },
  { key: "lastName", label: "Last name", aliases: ["lastName", "Last Name", "Client Last Name", "Last"] },
  { key: "email", label: "Email", aliases: ["email", "Email", "Email Address"] },
  { key: "phone", label: "Phone", aliases: ["phone", "Phone", "Phone Number"] },
  { key: "address1", label: "Property address", aliases: ["address1", "Address", "Property Address", "Street Address"] },
  { key: "city", label: "City", aliases: ["city", "City"] },
  { key: "state", label: "State", aliases: ["state", "State"] },
  { key: "postalCode", label: "ZIP", aliases: ["postalCode", "Postal Code", "Zip", "ZIP", "Zip Code"] },
  { key: "source", label: "Lead source", aliases: ["source", "Source", "Lead Source"] },
  { key: "referralSource", label: "Referral source", aliases: ["referralSource", "Referral", "Referral Source"] },
  { key: "carrierName", label: "Carrier", aliases: ["carrierName", "Carrier", "Insurance Carrier"] },
  { key: "policyNumber", label: "Policy number", aliases: ["policyNumber", "Policy", "Policy Number"] },
  { key: "claimNumber", label: "Claim number", aliases: ["claimNumber", "Claim Number", "Claim #"] },
  { key: "lossType", label: "Loss type", aliases: ["lossType", "Loss Type", "Damage Type", "Type of Loss"] },
  { key: "dateOfLoss", label: "Date of loss", aliases: ["dateOfLoss", "Date of Loss", "Loss Date"] },
  { key: "reportedDate", label: "Reported date", aliases: ["reportedDate", "Reported Date"] },
  { key: "inspectionDate", label: "Inspection date", aliases: ["inspectionDate", "Inspection Date"] },
  { key: "deadlineDate", label: "Deadline", aliases: ["deadlineDate", "Deadline", "Deadline Date"] },
  { key: "followUpDate", label: "Follow-up date", aliases: ["followUpDate", "Follow Up", "Follow-up", "Follow-up Date"] },
  { key: "notes", label: "Notes", aliases: ["notes", "Notes", "Comments"] },
];

const fieldsByKey = Object.fromEntries(fieldDefinitions.map((field) => [field.key, field])) as Record<ImportFieldKey, FieldDefinition>;

const importFields: Record<ImportType, ImportFieldKey[]> = {
  leads: ["firstName", "lastName", "email", "phone", "address1", "city", "state", "postalCode", "source", "referralSource", "lossType", "dateOfLoss", "followUpDate", "notes"],
  claims: ["firstName", "lastName", "email", "phone", "address1", "city", "state", "postalCode", "carrierName", "policyNumber", "claimNumber", "lossType", "dateOfLoss", "reportedDate", "inspectionDate", "deadlineDate", "notes"],
};

const requiredFields: Record<ImportType, ImportFieldKey[]> = {
  leads: ["firstName", "lastName", "address1", "city", "state", "postalCode", "source", "lossType"],
  claims: ["firstName", "lastName", "address1", "city", "state", "postalCode", "lossType"],
};

const requiredMessages: Partial<Record<ImportFieldKey, string>> = {
  firstName: "Add the client's first name.",
  lastName: "Add the client's last name.",
  address1: "Add the damaged property address.",
  city: "Add the property city.",
  state: "Add the property state.",
  postalCode: "Add the property ZIP code.",
  source: "Add where this lead came from.",
  lossType: "Add a short loss type, like water damage or roof leak.",
};

const dateFields = new Set<ImportFieldKey>(["dateOfLoss", "reportedDate", "inspectionDate", "deadlineDate", "followUpDate"]);

export function normalizeImportType(value: unknown): ImportType | undefined {
  if (value === "leads" || value === "claims") return value;
  return undefined;
}

export function hasUsableCsvRows(records: Record<string, string>[]) {
  return records.some((record) => Object.values(record).some((value) => value?.toString().trim().length > 0));
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function supportedFieldForHeader(importType: ImportType, header: string) {
  const normalized = normalizeHeader(header);
  const supportedKeys = new Set(importFields[importType]);

  return fieldDefinitions.find((field) => supportedKeys.has(field.key) && field.aliases.some((alias) => normalizeHeader(alias) === normalized));
}

function rowHasValues(row: string[]) {
  return row.some((value) => value.trim().length > 0);
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { value: "" };

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  const parts = isoMatch
    ? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
    : slashMatch
      ? { year: Number(slashMatch[3]), month: Number(slashMatch[1]), day: Number(slashMatch[2]) }
      : undefined;

  if (!parts) {
    return { value: trimmed, error: "Use dates like 2026-05-01 or 5/1/2026." };
  }

  const date = new Date(parts.year, parts.month - 1, parts.day);
  if (date.getFullYear() !== parts.year || date.getMonth() !== parts.month - 1 || date.getDate() !== parts.day) {
    return { value: trimmed, error: "Use a real calendar date." };
  }

  return {
    value: `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
  };
}

function duplicateKey(values: ImportRowValues, importType: ImportType) {
  if (importType === "claims" && values.claimNumber) {
    return `claim:${values.claimNumber.toLowerCase()}`;
  }

  const keyParts = [values.firstName, values.lastName, values.address1, values.lossType].map((value) => value?.toLowerCase().trim());
  if (keyParts.every(Boolean)) {
    return `${importType}:${keyParts.join("|")}`;
  }

  return undefined;
}

export function importColumnLabels(type: ImportType) {
  return importFields[type].map((field) => fieldsByKey[field].label);
}

export function requiredImportColumnLabels(type: ImportType) {
  return requiredFields[type].map((field) => fieldsByKey[field].label);
}

export function importTemplateCsv(type: ImportType, sample: "single" | "sample-office" = "single") {
  const headers = importFields[type];

  if (type === "leads" && sample === "sample-office") {
    return toCsv(headers, [
      ["Avery", "Rowe", "avery.rowe@example.com", "(813) 555-0108", "114 Cypress Bend Drive", "Tampa", "FL", "33602", "Past client", "Sarah Jenkins", "Kitchen water damage", "2026-05-01", "2026-05-05", "Call after 4 PM"],
      ["Marisol", "Vega", "marisol.vega@example.com", "(727) 555-0184", "281 Seabreeze Avenue", "St. Petersburg", "FL", "33704", "Referral", "Bayline Roofing", "Wind roof leak", "5/3/2026", "5/7/2026", "Wants a morning appointment"],
      ["Troy", "Whitman", "troy.whitman@example.com", "(941) 555-0147", "9 Pelican Key Road", "Clearwater", "FL", "33756", "Phone", "Past client", "Fire smoke damage", "2026-05-04", "2026-05-06", "Photos sent by text"],
    ]);
  }

  if (type === "leads") {
    return toCsv(headers, [["Jamie", "Cole", "jamie@example.com", "(813) 555-0123", "120 Bay Street", "Tampa", "FL", "33602", "Past client", "Neighbor referral", "Water damage", "2026-05-01", "2026-05-05", "Call after 4 PM"]]);
  }

  return toCsv(headers, [["Jordan", "Miles", "jordan@example.com", "(727) 555-0199", "88 Harbor Drive", "St. Petersburg", "FL", "33701", "Sun State Insurance", "SSI-HO-22931", "SSI-26-00452", "Wind / roof leak", "2026-04-28", "2026-04-29", "2026-05-02", "2026-06-01", "Review imported claim details"]]);
}

export function parseImportCsv(text: string, importType: ImportType, options: ParseOptions = {}): ImportPreview {
  const table = parse(text, { skip_empty_lines: true, trim: true, bom: true }) as string[][];
  const [rawHeaders, ...rawRows] = table;

  if (!rawHeaders || rawHeaders.length === 0) {
    throw new Error("The CSV did not include a header row.");
  }

  const columnMap = new Map<ImportFieldKey, number>();
  rawHeaders.forEach((header, index) => {
    const field = supportedFieldForHeader(importType, header);
    if (field && !columnMap.has(field.key)) {
      columnMap.set(field.key, index);
    }
  });

  const missingColumns = requiredFields[importType]
    .filter((field) => !columnMap.has(field))
    .map((field) => fieldsByKey[field].label);

  const seenKeys = new Set<string>();
  const existingClaimNumbers = new Set((options.existingClaimNumbers ?? []).map((claimNumber) => claimNumber.toLowerCase().trim()).filter(Boolean));
  const rows = rawRows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => rowHasValues(row))
    .map(({ row, rowNumber }): ImportPreviewRow => {
      const values: ImportRowValues = {};
      const errors: string[] = [];

      for (const field of importFields[importType]) {
        const columnIndex = columnMap.get(field);
        const rawValue = columnIndex === undefined ? "" : row[columnIndex]?.trim() ?? "";
        const normalizedDate = dateFields.has(field) ? normalizeDate(rawValue) : { value: rawValue };

        values[field] = normalizedDate.value;
        if (normalizedDate.error) {
          errors.push(`${fieldsByKey[field].label}: ${normalizedDate.error}`);
        }
      }

      for (const field of requiredFields[importType]) {
        if (!values[field]) {
          errors.push(requiredMessages[field] ?? `Add ${fieldsByKey[field].label.toLowerCase()}.`);
        }
      }

      if (values.email && !isEmailLike(values.email)) {
        errors.push("Email does not look right.");
      }

      const key = duplicateKey(values, importType);
      if (key) {
        if (seenKeys.has(key)) {
          errors.push(importType === "claims" ? "This claim number appears more than once in this file." : "This row looks like a duplicate lead in this file.");
        }
        seenKeys.add(key);
      }

      if (importType === "claims" && values.claimNumber && existingClaimNumbers.has(values.claimNumber.toLowerCase().trim())) {
        errors.push(`Claim number ${values.claimNumber} is already in this workspace.`);
      }

      return {
        rowNumber,
        values,
        errors,
      };
    });

  const rowsWithColumnErrors = rows.map((row) => ({
    ...row,
    errors: missingColumns.length > 0 ? [...row.errors, `Missing required columns: ${missingColumns.join(", ")}.`] : row.errors,
  }));

  return {
    importType,
    rows: rowsWithColumnErrors,
    missingColumns,
    validCount: rowsWithColumnErrors.filter((row) => row.errors.length === 0).length,
    invalidCount: rowsWithColumnErrors.filter((row) => row.errors.length > 0).length,
  };
}

export function validImportRows(preview: ImportPreview) {
  return preview.rows.filter((row) => row.errors.length === 0);
}

export function dateFromImportValue(value: string | undefined) {
  if (!value) return undefined;
  return new Date(`${value}T12:00:00`);
}