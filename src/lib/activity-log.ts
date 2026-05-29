import { ActivityType } from "@/generated/prisma/client";
import { labelFromEnum } from "@/lib/format";

export type ActivityTimelineFilter = "ALL" | "NOTES" | "DOCUMENTS" | "TASKS" | "MONEY" | "CLIENT_UPDATES";

type ActivityInput = {
  id: string;
  type: ActivityType;
  subject: string;
  body?: string | null;
  occurredAt: Date | string;
  createdAt?: Date | string;
  user?: { name: string } | null;
  contact?: { firstName: string; lastName: string } | null;
};

export type ActivityTimelineItem = {
  id: string;
  type: ActivityType;
  typeLabel: string;
  subject: string;
  body?: string;
  occurredAt: Date;
  userName: string;
  contactName?: string;
  category: Exclude<ActivityTimelineFilter, "ALL">;
};

const documentPattern = /(document request|document|uploaded)/i;
const taskPattern = /(task)/i;
const moneyPattern = /(invoice|payment|settlement|fee)/i;
const clientUpdatePattern = /(client status link|client status|client uploaded|client link)/i;

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function fullName(contact?: { firstName: string; lastName: string } | null) {
  if (!contact) return undefined;
  return `${contact.firstName} ${contact.lastName}`;
}

export function timelineCategoryForActivity(activity: Pick<ActivityInput, "subject" | "type">): Exclude<ActivityTimelineFilter, "ALL"> {
  if (activity.type !== ActivityType.NOTE) return "NOTES";
  if (moneyPattern.test(activity.subject)) return "MONEY";
  if (taskPattern.test(activity.subject)) return "TASKS";
  if (clientUpdatePattern.test(activity.subject)) return "CLIENT_UPDATES";
  if (documentPattern.test(activity.subject)) return "DOCUMENTS";
  return "NOTES";
}

export function buildClaimActivityTimeline(activities: ActivityInput[]): ActivityTimelineItem[] {
  return activities
    .map((activity) => ({
      id: activity.id,
      type: activity.type,
      typeLabel: labelFromEnum(activity.type),
      subject: activity.subject,
      body: activity.body?.trim() || undefined,
      occurredAt: toDate(activity.occurredAt),
      userName: activity.user?.name ?? "Office",
      contactName: fullName(activity.contact),
      category: timelineCategoryForActivity(activity),
    }))
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

export function normalizeTimelineFilter(value?: string | null): ActivityTimelineFilter {
  if (value === "NOTES" || value === "DOCUMENTS" || value === "TASKS" || value === "MONEY" || value === "CLIENT_UPDATES") {
    return value;
  }
  return "ALL";
}

export function filterTimelineItems(items: ActivityTimelineItem[], filter: ActivityTimelineFilter) {
  if (filter === "ALL") return items;
  return items.filter((item) => item.category === filter);
}

export function validateManualActivityInput(input: { subject?: string | null; body?: string | null }) {
  const subject = input.subject?.trim() ?? "";
  const body = input.body?.trim() ?? "";

  if (subject) return undefined;
  if (body) {
    const summary = body.slice(0, 72).trim();
    return summary ? summary : "Note";
  }

  return undefined;
}
