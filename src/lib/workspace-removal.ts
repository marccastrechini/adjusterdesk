export const PROTECTED_DEMO_WORKSPACE_NAME = "AdjusterDesk Demo Office";
export const STRIPE_DELETE_CONFIRMATION = "CONFIRM-DELETE-STRIPE";

export const workspaceRemovalErrorMessages = {
  "demo-office": "AdjusterDesk Demo Office cannot be archived or deleted.",
  "name-mismatch": "Type the exact workspace name to confirm this action.",
  "stripe-confirmation":
    "This workspace still has a Stripe subscription. Type CONFIRM-DELETE-STRIPE to acknowledge Stripe cleanup, or archive the workspace instead.",
  "system-admin-user": "This workspace includes a system admin user and cannot be archived or deleted.",
  "workspace-missing": "That workspace was not found.",
  "already-archived": "This workspace is already archived.",
  "not-archived": "This workspace is not archived.",
} as const;

export type WorkspaceRemovalErrorCode = keyof typeof workspaceRemovalErrorMessages;
export type WorkspaceRemovalAction = "archive" | "delete";

export type WorkspaceRemovalGuardInput = {
  action: WorkspaceRemovalAction;
  workspaceName: string;
  confirmationName: string;
  stripeDeleteConfirmation?: string;
  billingSubscriptionId?: string | null;
  hasSystemAdminUser: boolean;
  alreadyArchived?: boolean;
};

export type WorkspaceRemovalGuardResult = { ok: true } | { ok: false; code: WorkspaceRemovalErrorCode };

export function isProtectedDemoWorkspaceName(name: string) {
  return name.trim() === PROTECTED_DEMO_WORKSPACE_NAME;
}

export function hasBillingSubscriptionId(value?: string | null) {
  return Boolean(value?.trim());
}

export function workspaceRemovalErrorMessage(code: string | undefined) {
  if (!code || !(code in workspaceRemovalErrorMessages)) {
    return undefined;
  }

  return workspaceRemovalErrorMessages[code as WorkspaceRemovalErrorCode];
}

export function evaluateWorkspaceRemoval(input: WorkspaceRemovalGuardInput): WorkspaceRemovalGuardResult {
  if (isProtectedDemoWorkspaceName(input.workspaceName)) {
    return { ok: false, code: "demo-office" };
  }

  if (input.hasSystemAdminUser) {
    return { ok: false, code: "system-admin-user" };
  }

  if (input.confirmationName.trim() !== input.workspaceName.trim()) {
    return { ok: false, code: "name-mismatch" };
  }

  if (input.action === "delete" && hasBillingSubscriptionId(input.billingSubscriptionId)) {
    if (input.stripeDeleteConfirmation?.trim() !== STRIPE_DELETE_CONFIRMATION) {
      return { ok: false, code: "stripe-confirmation" };
    }
  }

  if (input.action === "archive" && input.alreadyArchived) {
    return { ok: false, code: "already-archived" };
  }

  return { ok: true };
}

export function evaluateWorkspaceRestore(alreadyArchived: boolean): WorkspaceRemovalGuardResult {
  if (!alreadyArchived) {
    return { ok: false, code: "not-archived" };
  }

  return { ok: true };
}

export function workspaceRemovalReturnPath(returnTo: string | undefined, fallback: string) {
  if (!returnTo || returnTo.includes("://") || returnTo.startsWith("//")) {
    return fallback;
  }

  const [pathname, query = ""] = returnTo.split("?");
  const detailMatch = /^\/system\/workspaces\/[A-Za-z0-9_-]+$/.test(pathname);
  if (pathname !== "/system/workspaces" && !detailMatch) {
    return fallback;
  }

  if (pathname === "/system/workspaces") {
    const params = new URLSearchParams(query);
    return params.get("archived") === "1" ? "/system/workspaces?archived=1" : "/system/workspaces";
  }

  return pathname;
}

export function workspaceRemovalAuditNote(input: {
  action: "archive" | "restore" | "delete";
  workspaceId: string;
  workspaceName: string;
  actorUserId: string;
  userCount: number;
  leadCount: number;
  claimCount: number;
  billingSubscriptionId?: string | null;
}) {
  const subject =
    input.action === "delete" ? "Workspace deleted" : input.action === "archive" ? "Workspace archived" : "Workspace restored";
  const verb = input.action === "delete" ? "Hard-deleted" : input.action === "archive" ? "Archived" : "Restored";
  const stripeNote = hasBillingSubscriptionId(input.billingSubscriptionId)
    ? ` Stripe subscription ${input.billingSubscriptionId?.trim()} was not changed in Stripe.`
    : "";

  return {
    subject,
    body: `${verb} workspace "${input.workspaceName}" (${input.workspaceId}) by user ${input.actorUserId}. Users ${input.userCount}, leads ${input.leadCount}, claims ${input.claimCount}.${stripeNote}`,
  };
}
