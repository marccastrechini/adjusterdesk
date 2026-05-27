export const noticeMessages = {
  "lead-created": {
    title: "Lead saved",
    message: "Add a follow-up note or convert the lead when the client is ready to open a claim.",
  },
  "claim-created": {
    title: "Claim saved",
    message: "The claim is ready for tasks, documents, notes, and money tracking.",
  },
  "lead-converted": {
    title: "Lead converted",
    message: "The new claim is open. Add the next task, document request, or claim note before moving on.",
  },
  "task-created": {
    title: "Task saved",
    message: "The follow-up now appears in this list and on Today when it is due.",
  },
  "task-saved": {
    title: "Task updated",
    message: "The task changes were saved.",
  },
  "deadline-saved": {
    title: "Claim deadline updated",
    message: "The claim deadline and next step now appear on this claim and in Today.",
  },
  "document-added": {
    title: "Document saved",
    message: "The document record is now attached to this claim.",
  },
  "document-requested": {
    title: "Client document requested",
    message: "The request now appears on this claim and in Today until it is resolved.",
  },
  "note-added": {
    title: "Note logged",
    message: "The call, text, email, or office note was added to the record.",
  },
  "settlement-added": {
    title: "Settlement round saved",
    message: "The demand, offer, and accepted amount are now tracked on this claim.",
  },
  "payment-recorded": {
    title: "Payment recorded",
    message: "The check or fee payment was saved and any selected invoice balance was updated.",
  },
  "invoice-created": {
    title: "Invoice saved",
    message: "The fee invoice is now tracked here and on the office money page.",
  },
  "client-status-updated": {
    title: "Client status updated",
    message: "The client-facing summary and next step are now reflected in the preview.",
  },
  "client-link-created": {
    title: "Client link created",
    message: "The client status link is ready to copy or open for review.",
  },
  "client-link-paused": {
    title: "Client link paused",
    message: "Clients who open this link will see that the status page is unavailable right now.",
  },
  "client-link-reactivated": {
    title: "Client link reactivated",
    message: "The client status link now opens the current claim status page again.",
  },
  "user-activated": {
    title: "User updated",
    message: "The user is now active in this demo workspace.",
  },
  "user-deactivated": {
    title: "User updated",
    message: "The user is now inactive in this demo workspace.",
  },
  "system-workspace-created": {
    title: "Workspace created",
    message: "The new workspace and owner user were created.",
  },
  "system-user-email-updated": {
    title: "User updated",
    message: "The user email address was updated.",
  },
  "system-user-activated": {
    title: "User updated",
    message: "The user is now active.",
  },
  "system-user-deactivated": {
    title: "User updated",
    message: "The user is now inactive.",
  },
} as const;

export type NoticeKey = keyof typeof noticeMessages;
type SearchParams = Record<string, string | string[] | undefined>;

export function getNoticeMessage(params: SearchParams) {
  const value = params.notice;
  const key = Array.isArray(value) ? value[0] : value;
  if (!key || !(key in noticeMessages)) return undefined;
  return noticeMessages[key as NoticeKey];
}

export function withNotice(path: string, notice: NoticeKey) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("notice", notice);
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}