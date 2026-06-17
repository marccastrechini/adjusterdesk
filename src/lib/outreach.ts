import { OutreachProspectStatus } from "@/generated/prisma/client";

export const outreachStatusOptions: Array<{ value: OutreachProspectStatus; label: string }> = [
  { value: OutreachProspectStatus.NOT_CONTACTED, label: "Not contacted" },
  { value: OutreachProspectStatus.READY_FOR_OUTREACH, label: "Ready for outreach" },
  { value: OutreachProspectStatus.CONTACTED, label: "Email 1 sent" },
  { value: OutreachProspectStatus.FOLLOW_UP_DUE, label: "Follow-up due" },
  { value: OutreachProspectStatus.REPLIED_INTERESTED, label: "Replied - interested" },
  { value: OutreachProspectStatus.REPLIED_NOT_NOW, label: "Replied - not now" },
  { value: OutreachProspectStatus.FIT_CHECK_SCHEDULED, label: "Fit check scheduled" },
  { value: OutreachProspectStatus.TRIAL_CREATED, label: "Trial created" },
  { value: OutreachProspectStatus.BAD_FIT, label: "Bad fit" },
];

export function outreachStatusLabel(status: OutreachProspectStatus) {
  return outreachStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export const outreachStatusGuide: Array<{ label: string; detail: string }> = [
  { label: "Not contacted", detail: "Prospect was added but not reviewed yet." },
  { label: "Ready for outreach", detail: "Prospect looks like a good small-office fit and is ready for Email 1." },
  { label: "Email 1 sent", detail: "First outreach email was sent with the free claim tracker link." },
  { label: "Follow-up due", detail: "No reply yet. Follow-up should be sent on the planned date." },
  { label: "Replied - interested", detail: "Prospect responded positively and wants to continue." },
  { label: "Replied - not now", detail: "Prospect replied but timing is not right yet." },
  { label: "Fit check scheduled", detail: "A short call is scheduled to confirm fit for first 10 claims." },
  { label: "Trial created", detail: "Trial signup was created for the office." },
  { label: "Bad fit", detail: "Not a fit for current product scope." },
];

export const freeClaimTrackerUrl = "https://adjusterdesk.xyz/free-public-adjuster-claim-tracker";
export const trialSignupUrl = "https://adjusterdesk.xyz/signup";
