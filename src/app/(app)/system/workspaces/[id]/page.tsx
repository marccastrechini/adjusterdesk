import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { enterSystemWorkspaceView, resendSystemUserInvite, setSystemUserActive, updateSystemUserEmail, updateSystemWorkspaceSubscription } from "@/lib/actions";
import { formatDate, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { planLabel, planLimitMessage, resolveIncludedUserLimit, subscriptionStatusLabel } from "@/lib/plans";
import { getSystemWorkspaceDetail } from "@/lib/queries";
import { SystemResetPasswordForm } from "@/components/system-reset-password-form";
import { Badge, ButtonLink, Card, Field, Notice, PageHeader, Section, SubmitButton, inputClassName } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SystemWorkspaceDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);
  const tempPassword = firstValue(query.tempPassword);

  const { workspace, owner, leadCount, claimCount } = await getSystemWorkspaceDetail(id);
  const activeUserCount = workspace.users.filter((entry) => entry.active).length;
  const includedUserLimit = resolveIncludedUserLimit(workspace);
  const overLimit = includedUserLimit > 0 && activeUserCount > includedUserLimit;
  const atLimit = includedUserLimit > 0 && activeUserCount >= includedUserLimit;
  const planDefaultLimit = ({
    [SubscriptionPlan.SOLO]: 1,
    [SubscriptionPlan.SMALL_OFFICE]: 3,
    [SubscriptionPlan.TEAM]: 7,
    [SubscriptionPlan.PROFESSIONAL]: "Custom",
  } as const)[workspace.subscriptionPlan];

  const errorMessage =
    error === "user-missing"
      ? "That user was not found in this workspace."
      : error === "user-email-duplicate"
        ? "That email is already used by another user."
        : error === "last-owner"
          ? "You cannot deactivate the last active owner in a workspace."
          : error === "invite-send"
            ? "Invite email could not be sent. Check system email setup and try again."
            : error === "user-limit"
              ? "This workspace is at its included active-user limit. Update plan or limit before activating another user."
              : error === "invalid-limit"
                ? "Included active-user limit must be a positive whole number."
          : undefined;

  return (
    <>
      <PageHeader
        title={workspace.name}
        description="System admin workspace detail for local workspace operations."
        actions={
          <>
            <form action={enterSystemWorkspaceView.bind(null, workspace.id)}>
              <SubmitButton>Enter workspace</SubmitButton>
            </form>
            <ButtonLink href="/system/workspaces" variant="secondary">Back to workspaces</ButtonLink>
          </>
        }
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">User update not completed</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}

      {tempPassword ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Temporary password (shown once)</p>
          <p className="mt-1 leading-6">Use this only for local bootstrap sign-in, then rotate from Account security.</p>
          <p className="mt-2 break-all rounded-md border border-amber-300 bg-amber-100 px-3 py-2 font-mono text-xs">{tempPassword}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Workspace created</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(workspace.createdAt)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Owner</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{owner ? `${owner.name} (${owner.email})` : "No owner user"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Leads</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{leadCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Claims</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{claimCount}</p>
        </Card>
      </div>

      <Section title="Plan and limits" description="Adjust plan, subscription status, and included active-user limit.">
        <Card className={overLimit ? "grid gap-4 border-rose-200 bg-rose-50" : atLimit ? "grid gap-4 border-amber-200 bg-amber-50" : "grid gap-4 border-teal-200 bg-teal-50"}>
          <div className="grid gap-1 text-sm leading-6 text-slate-700">
            <p><span className="font-semibold text-slate-950">Current plan:</span> {planLabel(workspace.subscriptionPlan)}</p>
            <p><span className="font-semibold text-slate-950">Subscription status:</span> {subscriptionStatusLabel(workspace.subscriptionStatus)}</p>
            <p><span className="font-semibold text-slate-950">Active users:</span> {activeUserCount} of {includedUserLimit > 0 ? includedUserLimit : "custom"} included</p>
            <p>{planLimitMessage({ activeUserCount, includedUserLimit })}</p>
          </div>

          <form action={updateSystemWorkspaceSubscription} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <Field label="Plan">
              <select name="subscriptionPlan" defaultValue={workspace.subscriptionPlan} className={inputClassName}>
                <option value={SubscriptionPlan.SOLO}>Solo</option>
                <option value={SubscriptionPlan.SMALL_OFFICE}>Small Office</option>
                <option value={SubscriptionPlan.TEAM}>Team</option>
                <option value={SubscriptionPlan.PROFESSIONAL}>Professional</option>
              </select>
            </Field>
            <Field label="Subscription status">
              <select name="subscriptionStatus" defaultValue={workspace.subscriptionStatus} className={inputClassName}>
                <option value={SubscriptionStatus.MANUAL}>Manual</option>
                <option value={SubscriptionStatus.TRIAL}>Trial</option>
                <option value={SubscriptionStatus.ACTIVE}>Active</option>
                <option value={SubscriptionStatus.PAST_DUE}>Past due</option>
                <option value={SubscriptionStatus.CANCELED}>Canceled</option>
              </select>
            </Field>
            <Field label="Included active-user limit" hint={`Leave blank to use the selected plan default (${planDefaultLimit}).`}>
              <input name="includedUserLimit" type="number" min={1} step={1} placeholder={String(workspace.includedUserLimit)} className={inputClassName} />
            </Field>
            <div className="md:col-span-3">
              <SubmitButton>Save plan settings</SubmitButton>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Workspace users" description="Update user email, reset passwords, and toggle active status.">
        <div className="grid gap-3">
          {workspace.users.map((user) => (
            <Card key={user.id}>
              <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
                <div>
                  <p className="font-semibold text-slate-950">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-600">Added {formatDate(user.createdAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{labelFromEnum(user.role)}</Badge>
                    <Badge tone={user.active ? "green" : "slate"}>{user.active ? "Active" : "Inactive"}</Badge>
                    {user.userInvitationTokens.length > 0 ? <Badge tone="amber">Invite pending</Badge> : null}
                    {user.isSystemAdmin ? <Badge tone="blue">System admin</Badge> : null}
                  </div>
                </div>

                <form action={updateSystemUserEmail} className="grid gap-2">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <input type="hidden" name="userId" value={user.id} />
                  <Field label="User email">
                    <input name="email" type="email" defaultValue={user.email} required className={inputClassName} />
                  </Field>
                  <SubmitButton variant="secondary">Update email</SubmitButton>
                </form>

                <div className="grid gap-2 content-start">
                  <SystemResetPasswordForm userId={user.id} workspaceId={workspace.id} />
                  {user.active ? (
                    <form action={resendSystemUserInvite.bind(null, user.id, workspace.id)}>
                      <SubmitButton variant="secondary">Resend invite</SubmitButton>
                    </form>
                  ) : null}
                  {user.active ? (
                    <form action={setSystemUserActive.bind(null, user.id, workspace.id, false)}>
                      <SubmitButton variant="secondary">Deactivate user</SubmitButton>
                    </form>
                  ) : (
                    <form action={setSystemUserActive.bind(null, user.id, workspace.id, true)}>
                      <SubmitButton>Reactivate user</SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
