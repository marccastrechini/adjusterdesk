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
  ];
}

export function activationProgress(items: ActivationChecklistItem[]) {
  return {
    completed: items.filter((item) => item.completed).length,
    total: items.length,
  };
}