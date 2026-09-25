import type { ReactNode } from "react";
import { archiveSystemWorkspace, deleteSystemWorkspace, restoreSystemWorkspace } from "@/lib/actions";
import { isProtectedDemoWorkspaceName, hasBillingSubscriptionId } from "@/lib/workspace-removal";
import { Card, Field, SubmitButton, inputClassName } from "@/components/ui";

type SystemWorkspaceRemovalPanelProps = {
  workspaceId: string;
  workspaceName: string;
  archivedAt: Date | null;
  userCount: number;
  leadCount: number;
  claimCount: number;
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
  billingPriceId: string | null;
  stripeConnectAccountId: string | null;
  hasSystemAdminUser: boolean;
  returnTo: string;
  layout: "compact" | "full";
};

function RemovalCounts({ userCount, leadCount, claimCount }: { userCount: number; leadCount: number; claimCount: number }) {
  return (
    <p className="text-sm text-slate-700">
      Users: <span className="font-semibold text-slate-950">{userCount}</span>
      {" · "}
      Leads: <span className="font-semibold text-slate-950">{leadCount}</span>
      {" · "}
      Claims: <span className="font-semibold text-slate-950">{claimCount}</span>
    </p>
  );
}

function StripeIds({
  billingCustomerId,
  billingSubscriptionId,
  billingPriceId,
  stripeConnectAccountId,
}: {
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
  billingPriceId: string | null;
  stripeConnectAccountId: string | null;
}) {
  const rows = [
    ["Billing customer", billingCustomerId],
    ["Billing subscription", billingSubscriptionId],
    ["Billing price", billingPriceId],
    ["Stripe Connect account", stripeConnectAccountId],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));

  if (rows.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-1 text-xs leading-5 text-slate-700">
      {rows.map(([label, value]) => (
        <li key={label}>
          <span className="font-semibold text-slate-950">{label}:</span> {value}
        </li>
      ))}
    </ul>
  );
}

function BlockedRemoval({ title, message, counts }: { title: string; message: string; counts: { userCount: number; leadCount: number; claimCount: number } }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-6">{message}</p>
      <div className="mt-2">
        <RemovalCounts {...counts} />
      </div>
    </div>
  );
}

export function SystemWorkspaceRemovalPanel({
  workspaceId,
  workspaceName,
  archivedAt,
  userCount,
  leadCount,
  claimCount,
  billingCustomerId,
  billingSubscriptionId,
  billingPriceId,
  stripeConnectAccountId,
  hasSystemAdminUser,
  returnTo,
  layout,
}: SystemWorkspaceRemovalPanelProps) {
  const counts = { userCount, leadCount, claimCount };
  const stripeSubscriptionPresent = hasBillingSubscriptionId(billingSubscriptionId);
  let body: ReactNode;

  if (isProtectedDemoWorkspaceName(workspaceName)) {
    body = (
      <BlockedRemoval
        title="Protected workspace"
        message="AdjusterDesk Demo Office cannot be archived or deleted."
        counts={counts}
      />
    );
  } else if (hasSystemAdminUser) {
    body = (
      <BlockedRemoval
        title="System admin workspace"
        message="This workspace includes a system admin user and cannot be archived or deleted."
        counts={counts}
      />
    );
  } else {
    body = (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="grid gap-3">
          <div>
            <p className="font-semibold text-slate-950">{archivedAt ? "Restore workspace" : "Archive workspace"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {archivedAt
                ? "Restore puts this workspace back on the default list. Records were kept."
                : "Archive hides this workspace from the default list. Records stay in the database and can be restored."}
            </p>
          </div>
          <RemovalCounts {...counts} />
          <StripeIds
            billingCustomerId={billingCustomerId}
            billingSubscriptionId={billingSubscriptionId}
            billingPriceId={billingPriceId}
            stripeConnectAccountId={stripeConnectAccountId}
          />
          {stripeSubscriptionPresent && !archivedAt ? (
            <p className="text-sm leading-6 text-amber-900">
              This workspace still has a Stripe subscription. Archive leaves that subscription in place. Prefer archive over hard delete.
            </p>
          ) : null}
          {archivedAt ? (
            <form action={restoreSystemWorkspace}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton variant="secondary">Restore workspace</SubmitButton>
            </form>
          ) : (
            <form action={archiveSystemWorkspace} className="grid gap-3">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Field label="Confirm workspace name" hint={`Type ${workspaceName} exactly.`} required>
                <input name="confirmationName" required autoComplete="off" spellCheck={false} className={inputClassName} />
              </Field>
              <SubmitButton>Archive workspace</SubmitButton>
            </form>
          )}
        </Card>

        <Card className="grid gap-3 border-rose-200 bg-rose-50">
          <div>
            <p className="font-semibold text-rose-950">Delete workspace permanently</p>
            <p className="mt-1 text-sm leading-6 text-rose-900">
              Hard delete removes this workspace and its users, leads, claims, and other records. This cannot be undone. Stripe is not canceled automatically.
            </p>
          </div>
          <RemovalCounts {...counts} />
          <StripeIds
            billingCustomerId={billingCustomerId}
            billingSubscriptionId={billingSubscriptionId}
            billingPriceId={billingPriceId}
            stripeConnectAccountId={stripeConnectAccountId}
          />
          <form action={deleteSystemWorkspace} className="grid gap-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Field label="Confirm workspace name" hint={`Type ${workspaceName} exactly.`} required>
              <input name="confirmationName" required autoComplete="off" spellCheck={false} className={inputClassName} />
            </Field>
            {stripeSubscriptionPresent ? (
              <Field label="Stripe cleanup acknowledgment" hint="Type CONFIRM-DELETE-STRIPE. This does not cancel the Stripe subscription." required>
                <input name="stripeDeleteConfirmation" required autoComplete="off" spellCheck={false} className={inputClassName} />
              </Field>
            ) : null}
            <SubmitButton variant="danger">Delete workspace permanently</SubmitButton>
          </form>
        </Card>
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div className="mt-4 border-t border-slate-200 pt-4">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-slate-800">Archive or delete</summary>
          <div className="mt-3">{body}</div>
        </details>
      </div>
    );
  }

  return body;
}
