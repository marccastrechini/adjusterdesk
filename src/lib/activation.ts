import type { CTAEventName } from "@/lib/analytics";

export type ActivationCounts = {
  leads: number;
  claims: number;
  openTasks: number;
  documents: number;
  templates: number;
  users: number;
  feedback: number;
};

export type ActivationChecklistItem = {
  title: string;
  description: string;
  href: string;
  action: string;
  completed: boolean;
};

export type OnboardingQuickAction = {
  title: string;
  description: string;
  href: string;
  action: string;
  completed: boolean;
  eventName?: CTAEventName;
  secondaryHref?: string;
  secondaryAction?: string;
};

export function buildOnboardingQuickActions(counts: ActivationCounts): OnboardingQuickAction[] {
  const hasWorkFile = counts.leads > 0 || counts.claims > 0;
  const hasClaims = counts.claims > 0;

  return [
    {
      title: "Start the first file",
      description: "Add the next claim now. If the intake is still early, save it as a lead first and come back to the claim when ready.",
      href: hasClaims ? "/claims" : "/claims/new",
      action: hasClaims ? "Review claims" : "Add first claim",
      completed: hasWorkFile,
      eventName: "onboarding_add_first_claim_click",
      secondaryHref: counts.leads > 0 ? "/leads" : "/leads/new",
      secondaryAction: counts.leads > 0 ? "Review leads" : "Add first lead",
    },
    {
      title: "Set the next follow-up",
      description: "Give the office one next call, deadline, document request, or receivable reminder so nothing sits in memory.",
      href: hasWorkFile ? "/today" : "/claims/new",
      action: hasWorkFile ? "Open Today" : "Add a claim first",
      completed: counts.openTasks > 0,
    },
    {
      title: "Save or request a document",
      description: "Use claim files for policy pages, photos, estimates, carrier letters, and anything you still need from the client.",
      href: hasClaims ? "/claims" : "/claims/new",
      action: counts.documents > 0 ? "Review claim files" : hasClaims ? "Open claims" : "Add a claim first",
      completed: counts.documents > 0,
      eventName: "onboarding_open_documents_click",
    },
    {
      title: "Open Today",
      description: "Today becomes the office worklist for due tasks, requested documents, deadlines, and receivables as soon as work starts moving.",
      href: "/today",
      action: "Open Today",
      completed: counts.openTasks > 0,
      eventName: "onboarding_open_today_click",
    },
    {
      title: "Review Money",
      description: "Settlement rounds, checks, invoices, and receivables all roll up into Money once the first claim is underway.",
      href: "/money",
      action: "Open Money",
      completed: hasClaims,
      eventName: "onboarding_open_money_click",
    },
  ];
}

export function buildActivationChecklist(counts: ActivationCounts): ActivationChecklistItem[] {
  return [
    {
      title: "Add or import the first lead",
      description: "Capture the next new call, referral, or spreadsheet row so follow-up work has a home.",
      href: counts.leads > 0 ? "/leads" : "/start/import",
      action: counts.leads > 0 ? "Review leads" : "Import lead list",
      completed: counts.leads > 0,
    },
    {
      title: "Open the first claim file",
      description: "Track the client, property, carrier, claim number, deadline, and short next step.",
      href: counts.claims > 0 ? "/claims" : "/claims/new",
      action: counts.claims > 0 ? "Review claims" : "Add first claim",
      completed: counts.claims > 0,
    },
    {
      title: "Schedule the next follow-up",
      description: "Use tasks for calls, document requests, carrier follow-ups, deadlines, and fee collection reminders.",
      href: "/today",
      action: counts.openTasks > 0 ? "Open Today" : "Open Today",
      completed: counts.openTasks > 0,
    },
    {
      title: "Save or request claim documents",
      description: "Keep policy pages, photos, estimates, carrier letters, settlement papers, and invoices attached to claims.",
      href: "/claims",
      action: counts.documents > 0 ? "Review claim files" : "Open claims",
      completed: counts.documents > 0,
    },
    {
      title: "Set office templates",
      description: "Keep routine task, document request, and client message wording ready for repeated work.",
      href: "/settings/templates",
      action: counts.templates > 0 ? "Review templates" : "Open templates",
      completed: counts.templates > 0,
    },
    {
      title: "Invite or confirm office users",
      description: "Make sure the owner, adjusters, and assistants who need access have active sign-in accounts.",
      href: "/settings/users",
      action: counts.users > 1 ? "Review users" : "Open users",
      completed: counts.users > 1,
    },
    {
      title: "Review client status links",
      description: "Confirm how clients can view claim updates and requested documents from a shared status link.",
      href: "/claims",
      action: counts.claims > 0 ? "Open claim links" : "Open claims",
      completed: counts.claims > 0,
    },
    {
      title: "Review plan and active-user limit",
      description: "Check current plan, subscription status, and active-user seats included for this workspace.",
      href: "/settings/billing",
      action: "Open billing",
      completed: counts.users > 0,
    },
  ];
}

export function activationProgress(items: ActivationChecklistItem[]) {
  return {
    completed: items.filter((item) => item.completed).length,
    total: items.length,
  };
}