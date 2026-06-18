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
  "document-request-received": {
    title: "Document request marked received",
    message: "This request is now marked received in the claim file.",
  },
  "document-request-not-needed": {
    title: "Document request marked not needed",
    message: "This request is closed and no longer appears as waiting on client.",
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
  "client-billing-connection-started": {
    title: "Stripe Connect onboarding started",
    message: "The Stripe onboarding link is ready. Finish setup so client billing can be enabled.",
  },
  "client-billing-status-refreshed": {
    title: "Client billing status refreshed",
    message: "The workspace billing connection status was updated.",
  },
  "client-billing-fee-updated": {
    title: "Fee recovery settings saved",
    message: "The client payment fee recovery settings were updated.",
  },
  "client-payment-request-sent": {
    title: "Payment request sent",
    message: "The hosted invoice link was created and can now be shared with the client.",
  },
  "client-payment-request-unavailable": {
    title: "Client billing not available",
    message: "Connect Stripe before sending hosted payment requests.",
  },
  "client-payment-request-already-sent": {
    title: "Payment request already sent",
    message: "This invoice already has an external payment request and its link is available below.",
  },
  "client-payment-fee-ack-required": {
    title: "Fee recovery acknowledgment required",
    message: "Review the fee recovery notice and acknowledge the responsibility before enabling it.",
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
    title: "Client link disabled",
    message: "Clients who open this link will see that the status page is unavailable right now.",
  },
  "client-link-reactivated": {
    title: "Client link enabled",
    message: "The client status link now opens the current claim status page again.",
  },
  "client-link-regenerated": {
    title: "Client link regenerated",
    message: "The new client status link is ready to copy. The previous link no longer opens this claim status page.",
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
  "system-workspace-subscription-updated": {
    title: "Workspace subscription updated",
    message: "Plan, subscription status, and included active-user limit were saved.",
  },
  "system-outreach-created": {
    title: "Outreach prospect added",
    message: "The outreach prospect is now in the outreach queue.",
  },
  "system-outreach-updated": {
    title: "Outreach prospect updated",
    message: "Prospect details, status, and follow-up notes were saved.",
  },
  "system-outreach-email-sent": {
    title: "Outreach email sent",
    message: "The outreach email was sent and activity was logged on this prospect.",
  },
  "system-outreach-task-updated": {
    title: "Outreach task updated",
    message: "The outreach task status was updated.",
  },
  "system-outreach-call-logged": {
    title: "Call attempt logged",
    message: "The call note was logged and related call tasks were completed when open.",
  },
  "system-outreach-operator-enabled": {
    title: "Outreach operator enabled",
    message: "This user can now access the outreach operator surface at /system/outreach.",
  },
  "system-outreach-operator-disabled": {
    title: "Outreach operator disabled",
    message: "This user no longer has outreach operator access.",
  },
  "system-outreach-operator-invite-created": {
    title: "Outreach operator invited",
    message: "A new outreach operator account was created and an invite email was sent.",
  },
  "system-outreach-operator-invite-updated": {
    title: "Outreach operator updated",
    message: "Existing account was updated to outreach operator and an invite email was sent.",
  },
  "system-outreach-operator-invite-resent": {
    title: "Outreach invite resent",
    message: "A fresh invite link was emailed to this outreach operator.",
  },
  "candidate-created": {
    title: "Lead candidate added",
    message: "The lead candidate is now in the intake queue for review.",
  },
  "candidate-updated": {
    title: "Lead candidate updated",
    message: "Candidate details and status were saved.",
  },
  "candidate-promoted": {
    title: "Candidate promoted to prospect",
    message: "The lead candidate was added to the outreach queue as a prospect with an initial task.",
  },
  "candidate-already-promoted": {
    title: "Already promoted",
    message: "This candidate was already promoted. Showing the linked prospect.",
  },
  "candidate-rejected": {
    title: "Candidate rejected",
    message: "The lead candidate was marked as rejected and removed from the active intake queue.",
  },
  "user-invite-sent": {
    title: "Invitation sent",
    message: "The user will receive an email link to set their password.",
  },
  "user-invite-resent": {
    title: "Invitation resent",
    message: "A new invitation link was emailed to this user.",
  },
  "password-changed": {
    title: "Password changed",
    message: "Your sign-in password was updated.",
  },
  "password-reset-requested": {
    title: "If that account is active, a reset email was sent",
    message: "Check the inbox for a reset link. For security, this page does not confirm whether an email address exists.",
  },
  "password-reset-complete": {
    title: "Password reset complete",
    message: "Your password was updated. Sign in with the new password.",
  },
  "invite-accepted": {
    title: "Account setup complete",
    message: "Your password is set. Sign in with your email and new password.",
  },
  "self-service-signup-complete": {
    title: "Welcome to AdjusterDesk",
    message: "Your workspace is ready and your 14-day free trial has started. No credit card is required during your trial.",
  },
  "billing-portal-unavailable": {
    title: "Billing portal unavailable",
    message: "This workspace does not have a customer billing portal link yet. Contact support for billing changes.",
  },
  "subscription-activated": {
    title: "Subscription started",
    message: "Your subscription is now active. Thank you for subscribing to AdjusterDesk.",
  },
  "subscription-canceled": {
    title: "Subscription not started",
    message: "You returned to billing without completing checkout. You can try again when you are ready.",
  },
  "billing-setup-incomplete": {
    title: "Billing not available",
    message: "Subscription checkout is not configured in this environment. Contact support for help.",
  },
  "billing-invalid-plan": {
    title: "Plan selection not valid",
    message: "Select Solo, Small Office, or Team to start a subscription.",
  },
  "billing-conversion-not-allowed": {
    title: "Subscription cannot be started",
    message: "This workspace is not currently eligible to start a new subscription from Billing.",
  },
  "billing-permission-denied": {
    title: "Billing permission required",
    message: "Only workspace owners can start subscriptions from Billing.",
  },
  "feedback-sent": {
    title: "Feedback saved",
    message: "Thanks. The note is saved with this workspace for review.",
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