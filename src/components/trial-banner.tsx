import Link from "next/link";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { trialPromptState, trialDaysRemaining, type TrialPromptState } from "@/lib/trial";

type FirmTrialFields = {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
};

function daysLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function TrialBanner({ firm }: { firm: FirmTrialFields }) {
  const state: TrialPromptState = trialPromptState(firm);

  if (state === "none") {
    return null;
  }

  const days = firm.trialEndsAt ? trialDaysRemaining(firm.trialEndsAt) : null;

  if (state === "comfortable") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Free trial: {days !== null && days >= 0 ? `${daysLabel(days)} left.` : "active."} No credit card required. Choose a plan anytime from{" "}
          <Link href="/settings/billing" className="font-medium text-teal-800 hover:underline">
            Billing
          </Link>
          .
        </p>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">Your free trial has ended. Choose a plan to keep using AdjusterDesk.</p>
        <Link
          href="/settings/billing"
          className="inline-flex min-h-9 items-center justify-center rounded-md bg-teal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-800 whitespace-nowrap"
        >
          Choose a plan
        </Link>
      </div>
    );
  }

  if (state === "ending-imminent") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          Your free trial ends {days !== null ? `in ${daysLabel(days)}` : "very soon"}. Choose a plan to continue without interruption.
        </p>
        <Link
          href="/settings/billing"
          className="inline-flex min-h-9 items-center justify-center rounded-md bg-teal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-800 whitespace-nowrap"
        >
          Choose a plan
        </Link>
      </div>
    );
  }

  // ending-soon: 2–7 days
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Your free trial ends {days !== null ? `in ${daysLabel(days)}` : "soon"}.{" "}
        <Link href="/settings/billing" className="font-medium text-teal-800 hover:underline">
          Choose a plan
        </Link>{" "}
        when you are ready.
      </p>
    </div>
  );
}
