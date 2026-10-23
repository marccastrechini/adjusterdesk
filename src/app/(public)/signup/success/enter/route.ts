import { redirect } from "next/navigation";
import { parsePlanSlug } from "@/lib/billing";
import { withNotice } from "@/lib/notices";
import { replaceSessionForUser } from "@/lib/session";
import { completeStripeSignupFromSessionId } from "@/lib/signup";

export const dynamic = "force-dynamic";

function failureHref(sessionId: string, plan: string | null) {
  const params = new URLSearchParams({ signin: "failed" });
  if (sessionId) {
    params.set("session_id", sessionId);
  }
  if (plan) {
    params.set("plan", plan);
  }
  return `/signup/success?${params.toString()}`;
}

async function ownerFromVerifiedCheckout(sessionId: string, failed: string) {
  try {
    const result = await completeStripeSignupFromSessionId(sessionId);
    return result.ownerUserId;
  } catch (error) {
    console.warn(
      "Signup office sign-in could not verify the checkout session.",
      error instanceof Error ? error.message : "unknown",
    );
    redirect(failed);
  }
}

async function replaceOwnerSession(ownerUserId: string, failed: string) {
  try {
    return await replaceSessionForUser(ownerUserId);
  } catch (error) {
    console.warn(
      "Signup office sign-in could not replace the current session.",
      error instanceof Error ? error.message : "unknown",
    );
    redirect(failed);
  }
}

/**
 * Verifies the completed Checkout session and signs in that office's owner.
 * Cookie changes are legal here. The success page is a Server Component and cannot set them.
 * An existing session for another office is replaced, including an admin workspace override.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim() ?? "";
  const plan = parsePlanSlug(url.searchParams.get("plan"));
  const failed = failureHref(sessionId, plan);

  if (!sessionId) {
    redirect("/signup/success?signin=failed");
  }

  const ownerUserId = await ownerFromVerifiedCheckout(sessionId, failed);
  const replaced = await replaceOwnerSession(ownerUserId, failed);
  if (!replaced) {
    redirect(failed);
  }

  redirect(withNotice(plan ? `/start?signup_plan=${plan}` : "/start", "self-service-signup-complete"));
}
