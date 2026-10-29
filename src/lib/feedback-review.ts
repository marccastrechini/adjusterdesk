import { sendFeedbackOwnerEmail, type FeedbackOwnerEmailInput } from "@/lib/email";
import { resolveAppBaseUrl } from "@/lib/env";

export const feedbackOwnerMail = {
  send: sendFeedbackOwnerEmail,
};

export function feedbackOwnerReviewUrl(entryId: string) {
  return `${resolveAppBaseUrl()}/system/feedback#${entryId}`;
}

export async function notifyOwnerOfNewFeedback(input: FeedbackOwnerEmailInput) {
  try {
    const result = await feedbackOwnerMail.send(input);
    if (!result.ok) {
      console.error(`[feedback] Owner notification not sent: ${result.error ?? "Unknown email error."}`);
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error.";
    console.error(`[feedback] Owner notification not sent: ${message}`);
    return { ok: false, error: message };
  }
}
