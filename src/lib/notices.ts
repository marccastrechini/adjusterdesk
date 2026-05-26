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