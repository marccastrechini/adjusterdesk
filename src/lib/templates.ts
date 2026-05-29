import { DocumentCategory, TaskPriority, TemplateType } from "@/generated/prisma/client";
import type { DocumentCategory as DocumentCategoryValue, TaskPriority as TaskPriorityValue, TemplateType as TemplateTypeValue } from "@/generated/prisma/client";

type MaybeText = string | null | undefined;

export type TaskTemplate = {
  key: string;
  title: string;
  notes: string;
  priority: TaskPriorityValue;
};

export type DueDatePreset = "TODAY" | "TOMORROW" | "IN_3_DAYS" | "IN_1_WEEK" | "CUSTOM";

export type TaskAssociationTarget = "claim" | "lead" | "general";

export type DocumentCategoryGuide = {
  category: DocumentCategoryValue;
  label: string;
  examples: string;
};

export type DocumentRequestTemplate = {
  key: string;
  title: string;
  category: DocumentCategoryValue;
  notes: string;
};

export type SavedMessageTemplate = {
  name: string;
  subject: string | null;
  body: string;
  type: TemplateTypeValue;
};

export type TemplateUsageSummary = {
  title: string;
  status: "Active" | "Partially used" | "Planned";
  usedIn: string;
  example: string;
};

const taskPriorityValues = new Set<string>(Object.values(TaskPriority));
const documentCategoryValues = new Set<string>(Object.values(DocumentCategory));
const dueDatePresetValues = new Set<DueDatePreset>(["TODAY", "TOMORROW", "IN_3_DAYS", "IN_1_WEEK", "CUSTOM"]);

export const messageTemplateTypes: TemplateTypeValue[] = [TemplateType.EMAIL, TemplateType.TEXT, TemplateType.LETTER];

export const dueDatePresetOptions = [
  ["TODAY", "Today"],
  ["TOMORROW", "Tomorrow"],
  ["IN_3_DAYS", "In 3 days"],
  ["IN_1_WEEK", "In 1 week"],
  ["CUSTOM", "Custom date"],
] as const satisfies readonly [DueDatePreset, string][];

export const templateUsageSummaries = [
  {
    title: "Task templates",
    status: "Active",
    usedIn: "Claim tasks and lead follow-ups",
    example: "Used when adding claim tasks.",
  },
  {
    title: "Document request templates",
    status: "Active",
    usedIn: "Claim documents",
    example: "Used when requesting claim documents.",
  },
  {
    title: "Message templates",
    status: "Partially used",
    usedIn: "Claim communications",
    example: "Used when logging a call, text, email, or letter note.",
  },
  {
    title: "Checklist templates",
    status: "Planned",
    usedIn: "Settings only for now",
    example: "Not connected to a claim workflow yet.",
  },
] as const satisfies readonly TemplateUsageSummary[];

export const taskTemplates = [
  {
    key: "follow-up-with-lead",
    title: "Follow up with lead",
    notes: "Call or text the lead, confirm interest, and set the next appointment or document request.",
    priority: TaskPriority.NORMAL,
  },
  {
    key: "schedule-inspection",
    title: "Schedule inspection",
    notes: "Coordinate a property inspection time with the client and assigned adjuster.",
    priority: TaskPriority.HIGH,
  },
  {
    key: "request-policy-documents",
    title: "Request policy documents",
    notes: "Ask the client for declarations pages, policy forms, and any carrier claim paperwork.",
    priority: TaskPriority.NORMAL,
  },
  {
    key: "upload-photos",
    title: "Upload photos",
    notes: "Add damage photos, room overview photos, and any mitigation progress photos to the claim.",
    priority: TaskPriority.NORMAL,
  },
  {
    key: "send-estimate-proposal",
    title: "Send estimate/proposal",
    notes: "Send the estimate, proposal, or supporting package and log who received it.",
    priority: TaskPriority.NORMAL,
  },
  {
    key: "follow-up-with-carrier",
    title: "Follow up with carrier",
    notes: "Ask for claim status, missing items, next review date, and the assigned desk adjuster contact.",
    priority: TaskPriority.HIGH,
  },
  {
    key: "check-settlement-payment",
    title: "Check on settlement payment",
    notes: "Confirm whether the settlement check was issued, mailed, received, or needs a carrier follow-up.",
    priority: TaskPriority.HIGH,
  },
  {
    key: "send-invoice",
    title: "Send invoice",
    notes: "Send the fee invoice with payment instructions and record the sent date on the claim.",
    priority: TaskPriority.NORMAL,
  },
  {
    key: "follow-up-on-receivable",
    title: "Follow up on receivable",
    notes: "Check on unpaid fee balance, expected payment date, and any missing invoice details.",
    priority: TaskPriority.HIGH,
  },
  {
    key: "update-client-status-link",
    title: "Update client status link",
    notes: "Update the client-facing status summary and next step, then confirm the share link is active.",
    priority: TaskPriority.NORMAL,
  },
] as const satisfies readonly TaskTemplate[];

export const documentCategoryGuides = [
  { category: DocumentCategory.POLICY, label: "Policy", examples: "Declarations pages, policy forms, endorsements" },
  { category: DocumentCategory.CONTRACT, label: "Contract", examples: "Signed public adjusting agreement, authorization forms" },
  { category: DocumentCategory.ESTIMATE, label: "Estimate", examples: "Carrier estimate, contractor estimate, office estimate" },
  { category: DocumentCategory.PHOTOS, label: "Photos", examples: "Damage photos, room photos, mitigation photos" },
  { category: DocumentCategory.CARRIER_CORRESPONDENCE, label: "Carrier correspondence", examples: "Carrier emails, letters, claim status messages" },
  { category: DocumentCategory.SETTLEMENT_DOCUMENTS, label: "Settlement documents", examples: "Settlement letters, releases, check details" },
  { category: DocumentCategory.INVOICE, label: "Invoice", examples: "Fee invoice, paid invoice, receivable backup" },
  { category: DocumentCategory.OTHER, label: "Other", examples: "Receipts, notes, forms that do not fit elsewhere" },
] as const satisfies readonly DocumentCategoryGuide[];

export const documentRequestTemplates = [
  {
    key: "policy-documents",
    title: "Policy declarations and forms",
    category: DocumentCategory.POLICY,
    notes: "Please send the declarations pages, policy forms, and any endorsements for this claim.",
  },
  {
    key: "signed-contract",
    title: "Signed public adjusting contract",
    category: DocumentCategory.CONTRACT,
    notes: "Please send the signed public adjusting agreement or authorization form.",
  },
  {
    key: "estimate",
    title: "Contractor estimate",
    category: DocumentCategory.ESTIMATE,
    notes: "Please send any carrier, contractor, or repair estimate related to the loss.",
  },
  {
    key: "photos",
    title: "Damage photos and videos",
    category: DocumentCategory.PHOTOS,
    notes: "Please send clear photos or videos of the damaged areas, plus any mitigation progress photos.",
  },
  {
    key: "carrier-correspondence",
    title: "Carrier emails or letters",
    category: DocumentCategory.CARRIER_CORRESPONDENCE,
    notes: "Please send any recent carrier emails, letters, or claim status messages.",
  },
  {
    key: "settlement-documents",
    title: "Settlement letter or release",
    category: DocumentCategory.SETTLEMENT_DOCUMENTS,
    notes: "Please send the settlement letter, release, payment breakdown, or check details.",
  },
  {
    key: "invoice",
    title: "Receipts or invoices",
    category: DocumentCategory.INVOICE,
    notes: "Please send the invoice, check copy, receipt, or payment backup for the claim file.",
  },
  {
    key: "mortgage-company-info",
    title: "Mortgage company information",
    category: DocumentCategory.OTHER,
    notes: "Please send the mortgage company name, claim/loss draft details, and contact information.",
  },
  {
    key: "other",
    title: "Other claim document",
    category: DocumentCategory.OTHER,
    notes: "Please send the document requested by the office for this claim file.",
  },
] as const satisfies readonly DocumentRequestTemplate[];

function cleanText(value: MaybeText) {
  return value?.trim() || undefined;
}

function dateAtNoon(value: Date) {
  const nextDate = new Date(value);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

function parseDateInput(value: MaybeText) {
  const dateText = cleanText(value);
  if (!dateText) return undefined;
  return new Date(`${dateText}T12:00:00`);
}

export function getTaskTemplate(key: MaybeText) {
  const cleanKey = cleanText(key);
  if (!cleanKey) return undefined;
  return taskTemplates.find((template) => template.key === cleanKey);
}

export function normalizeDueDatePreset(value: MaybeText): DueDatePreset {
  const preset = cleanText(value);
  if (preset && dueDatePresetValues.has(preset as DueDatePreset)) return preset as DueDatePreset;
  return "TODAY";
}

export function dueDateFromPreset(preset: DueDatePreset, now = new Date()) {
  const baseDate = dateAtNoon(now);
  if (preset === "TODAY") return baseDate;

  const nextDate = new Date(baseDate);
  if (preset === "TOMORROW") {
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  }
  if (preset === "IN_3_DAYS") {
    nextDate.setDate(nextDate.getDate() + 3);
    return nextDate;
  }
  if (preset === "IN_1_WEEK") {
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
  }

  return undefined;
}

export function taskDueDateFromInput(input: {
  duePreset?: MaybeText;
  dueDate?: MaybeText;
  now?: Date;
}) {
  const preset = normalizeDueDatePreset(input.duePreset);
  if (preset === "CUSTOM") return parseDateInput(input.dueDate);
  return dueDateFromPreset(preset, input.now);
}

export function taskAssociationFromInput(input: {
  claimId?: MaybeText;
  leadId?: MaybeText;
}) {
  const claimId = cleanText(input.claimId);
  const leadId = cleanText(input.leadId);

  if (claimId && leadId) {
    return {
      claimId,
      leadId,
      target: "general" as const,
      error: "Choose either a claim or a lead when creating a task.",
    };
  }

  if (claimId) return { claimId, leadId: undefined, target: "claim" as const, error: undefined };
  if (leadId) return { claimId: undefined, leadId, target: "lead" as const, error: undefined };
  return { claimId: undefined, leadId: undefined, target: "general" as const, error: undefined };
}

export function taskTemplateActivityNote(input: {
  templateKey?: MaybeText;
  taskTitle: string;
  dueDate?: Date;
  target: TaskAssociationTarget;
}) {
  const template = getTaskTemplate(input.templateKey);
  if (!template) return undefined;

  const targetLabel = input.target === "claim" ? "claim" : input.target === "lead" ? "lead" : "record";
  const dueSummary = input.dueDate ? `Due ${input.dueDate.toISOString().slice(0, 10)}.` : "No due date set.";

  return {
    subject: `Task added from template: ${input.taskTitle}`,
    body: `Added from the "${template.title}" template for this ${targetLabel}. ${dueSummary}`,
  };
}

export function getDocumentRequestTemplate(key: MaybeText) {
  const cleanKey = cleanText(key);
  if (!cleanKey) return undefined;
  return documentRequestTemplates.find((template) => template.key === cleanKey);
}

export function taskInputFromTemplate(input: {
  templateKey?: MaybeText;
  title?: MaybeText;
  notes?: MaybeText;
  priority?: MaybeText;
}) {
  const template = getTaskTemplate(input.templateKey);
  const priority = cleanText(input.priority);

  return {
    title: cleanText(input.title) ?? template?.title ?? "",
    notes: cleanText(input.notes) ?? template?.notes,
    priority: taskPriorityValues.has(priority ?? "") ? (priority as TaskPriorityValue) : template?.priority ?? TaskPriority.NORMAL,
  };
}

export function documentInputFromTemplate(input: {
  templateKey?: MaybeText;
  title?: MaybeText;
  category?: MaybeText;
  notes?: MaybeText;
  requestedFromClient?: boolean;
  hasFile?: boolean;
}) {
  const template = getDocumentRequestTemplate(input.templateKey);
  const category = cleanText(input.category);

  return {
    title: cleanText(input.title) ?? template?.title ?? "",
    category: template?.category ?? (documentCategoryValues.has(category ?? "") ? (category as DocumentCategoryValue) : DocumentCategory.OTHER),
    notes: cleanText(input.notes) ?? template?.notes,
    requestedFromClient: Boolean(input.requestedFromClient || (template && !input.hasFile)),
  };
}

export function activityInputFromTemplate(input: {
  template?: SavedMessageTemplate;
  subject?: MaybeText;
  body?: MaybeText;
}) {
  const templateSubject = cleanText(input.template?.subject) ?? cleanText(input.template?.name);

  return {
    subject: cleanText(input.subject) ?? templateSubject ?? "",
    body: cleanText(input.body) ?? cleanText(input.template?.body),
  };
}