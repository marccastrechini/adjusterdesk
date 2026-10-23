import { checkoutFactsFromStripeSession, emptyCheckoutFacts, type CheckoutSuccessFacts } from "@/lib/billing-display";
import { prisma } from "@/lib/prisma";
import { hasStripeSecretKey, requireStripeClient } from "@/lib/stripe";

export async function readSignupCheckoutFacts(sessionId: string | undefined): Promise<CheckoutSuccessFacts> {
  if (!sessionId) {
    return emptyCheckoutFacts();
  }

  let workspaceReady = false;
  try {
    const intent = await prisma.signupIntent.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      select: { status: true, completedFirmId: true },
    });
    workspaceReady = intent?.status === "COMPLETED" && Boolean(intent.completedFirmId);
  } catch {
    workspaceReady = false;
  }

  if (!hasStripeSecretKey()) {
    return emptyCheckoutFacts({ workspaceReady });
  }

  try {
    const stripe = requireStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    return checkoutFactsFromStripeSession(session, { workspaceReady });
  } catch {
    return emptyCheckoutFacts({ workspaceReady });
  }
}
