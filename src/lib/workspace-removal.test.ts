import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROTECTED_DEMO_WORKSPACE_NAME,
  STRIPE_DELETE_CONFIRMATION,
  evaluateWorkspaceRemoval,
  evaluateWorkspaceRestore,
  isProtectedDemoWorkspaceName,
  workspaceRemovalAuditNote,
  workspaceRemovalErrorMessage,
  workspaceRemovalReturnPath,
} from "./workspace-removal";

const smokeWorkspace = {
  workspaceName: "Smoke Office 42",
  confirmationName: "Smoke Office 42",
  hasSystemAdminUser: false,
  billingSubscriptionId: null,
};

describe("workspace removal guards", () => {
  it("blocks archive and delete of AdjusterDesk Demo Office by exact name", () => {
    assert.equal(isProtectedDemoWorkspaceName(PROTECTED_DEMO_WORKSPACE_NAME), true);
    assert.equal(isProtectedDemoWorkspaceName(`  ${PROTECTED_DEMO_WORKSPACE_NAME}  `), true);
    assert.equal(isProtectedDemoWorkspaceName("AdjusterDesk Demo"), false);

    for (const action of ["archive", "delete"] as const) {
      const decision = evaluateWorkspaceRemoval({
        action,
        workspaceName: PROTECTED_DEMO_WORKSPACE_NAME,
        confirmationName: PROTECTED_DEMO_WORKSPACE_NAME,
        stripeDeleteConfirmation: STRIPE_DELETE_CONFIRMATION,
        hasSystemAdminUser: false,
      });

      assert.equal(decision.ok, false);
      if (!decision.ok) {
        assert.equal(decision.code, "demo-office");
      }
    }
  });

  it("requires the exact workspace name before archive or delete", () => {
    const archived = evaluateWorkspaceRemoval({
      ...smokeWorkspace,
      action: "archive",
      confirmationName: "smoke office 42",
    });
    const deleted = evaluateWorkspaceRemoval({
      ...smokeWorkspace,
      action: "delete",
      confirmationName: "Smoke Office",
    });
    const confirmed = evaluateWorkspaceRemoval({
      ...smokeWorkspace,
      action: "archive",
      confirmationName: "  Smoke Office 42  ",
    });

    assert.equal(archived.ok, false);
    assert.equal(deleted.ok, false);
    if (!archived.ok) assert.equal(archived.code, "name-mismatch");
    if (!deleted.ok) assert.equal(deleted.code, "name-mismatch");
    assert.equal(confirmed.ok, true);
  });

  it("allows archive when a Stripe subscription is present and requires CONFIRM-DELETE-STRIPE for hard delete", () => {
    const withStripe = {
      ...smokeWorkspace,
      billingSubscriptionId: " sub_123 ",
    };

    const archived = evaluateWorkspaceRemoval({
      ...withStripe,
      action: "archive",
    });
    const missingPhrase = evaluateWorkspaceRemoval({
      ...withStripe,
      action: "delete",
      stripeDeleteConfirmation: "DELETE",
    });
    const confirmed = evaluateWorkspaceRemoval({
      ...withStripe,
      action: "delete",
      stripeDeleteConfirmation: `  ${STRIPE_DELETE_CONFIRMATION}  `,
    });
    const noSubscription = evaluateWorkspaceRemoval({
      ...smokeWorkspace,
      action: "delete",
      billingSubscriptionId: "   ",
    });

    assert.equal(archived.ok, true);
    assert.equal(missingPhrase.ok, false);
    if (!missingPhrase.ok) assert.equal(missingPhrase.code, "stripe-confirmation");
    assert.equal(confirmed.ok, true);
    assert.equal(noSubscription.ok, true);
  });

  it("refuses archive and delete when the workspace has a system admin user", () => {
    for (const action of ["archive", "delete"] as const) {
      const decision = evaluateWorkspaceRemoval({
        ...smokeWorkspace,
        action,
        hasSystemAdminUser: true,
        billingSubscriptionId: "sub_123",
        stripeDeleteConfirmation: STRIPE_DELETE_CONFIRMATION,
      });

      assert.equal(decision.ok, false);
      if (!decision.ok) {
        assert.equal(decision.code, "system-admin-user");
      }
    }
  });

  it("rejects a second archive and a restore of an active workspace", () => {
    const secondArchive = evaluateWorkspaceRemoval({
      ...smokeWorkspace,
      action: "archive",
      alreadyArchived: true,
    });
    const restoreActive = evaluateWorkspaceRestore(false);
    const restoreArchived = evaluateWorkspaceRestore(true);

    assert.equal(secondArchive.ok, false);
    if (!secondArchive.ok) assert.equal(secondArchive.code, "already-archived");
    assert.equal(restoreActive.ok, false);
    if (!restoreActive.ok) assert.equal(restoreActive.code, "not-archived");
    assert.equal(restoreArchived.ok, true);
  });

  it("keeps removal redirects on system workspace paths and explains guard errors", () => {
    assert.equal(workspaceRemovalReturnPath(undefined, "/system/workspaces"), "/system/workspaces");
    assert.equal(workspaceRemovalReturnPath("/system/workspaces?archived=1&notice=x", "/fallback"), "/system/workspaces?archived=1");
    assert.equal(workspaceRemovalReturnPath("/system/workspaces/firm_123?archived=1", "/fallback"), "/system/workspaces/firm_123");
    assert.equal(workspaceRemovalReturnPath("https://example.com/system/workspaces", "/fallback"), "/fallback");
    assert.equal(workspaceRemovalReturnPath("//example.com", "/fallback"), "/fallback");
    assert.equal(workspaceRemovalReturnPath("/system/users", "/fallback"), "/fallback");
    assert.equal(workspaceRemovalErrorMessage("demo-office"), "AdjusterDesk Demo Office cannot be archived or deleted.");
    assert.equal(workspaceRemovalErrorMessage("not-a-code"), undefined);
  });

  it("writes an audit note with counts and the untouched Stripe subscription id", () => {
    const note = workspaceRemovalAuditNote({
      action: "delete",
      workspaceId: "firm_123",
      workspaceName: "Smoke Office 42",
      actorUserId: "user_9",
      userCount: 2,
      leadCount: 4,
      claimCount: 1,
      billingSubscriptionId: "sub_123",
    });

    assert.equal(note.subject, "Workspace deleted");
    assert.match(note.body, /Hard-deleted workspace "Smoke Office 42"/);
    assert.match(note.body, /Users 2, leads 4, claims 1/);
    assert.match(note.body, /sub_123 was not changed in Stripe/);
  });
});
