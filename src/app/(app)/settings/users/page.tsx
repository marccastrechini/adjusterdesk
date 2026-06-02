import { createUser, resendUserInvite, setUserActive } from "@/lib/user-actions";
import { formatDate, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { userRoleOptions } from "@/lib/options";
import { planLabel, planLimitMessage, resolveIncludedUserLimit } from "@/lib/plans";
import { getUsers } from "@/lib/queries";
import { Badge, Card, Field, Notice, StatCard, inputClassName, PageHeader, Section, selectClassName, SubmitButton } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);
  const { firm, users, user: currentUser } = await getUsers();
  const activeUsers = users.filter((entry) => entry.active);
  const inactiveUsers = users.filter((entry) => !entry.active);
  const ownerUsers = users.filter((entry) => entry.role === "OWNER");
  const includedUserLimit = resolveIncludedUserLimit(firm);
  const atLimit = includedUserLimit > 0 && activeUsers.length >= includedUserLimit;
  const overLimit = includedUserLimit > 0 && activeUsers.length > includedUserLimit;

  const errorMessage =
    error === "current-user"
      ? "You cannot deactivate the current signed-in user."
      : error === "last-owner"
        ? "You cannot deactivate the last active owner in this office."
        : error === "missing"
          ? "That user was not found in this office."
          : error === "email-duplicate"
            ? "That email address is already used by another account."
            : error === "invite-send"
              ? "Invite email could not be sent. Check system email setup and try again."
              : error === "user-limit"
                ? "This office is at its included active-user limit. Deactivate a user or ask support to adjust the plan before adding another active user."
          : undefined;

  return (
    <>
      <PageHeader title="Users" description="Office users for signing in and assigning claims, tasks, documents, and communication notes." />
      <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
        <p className="font-semibold">Office sign-in users</p>
        <p className="mt-1 leading-6">Add users by email invite so they set their own password securely. System-admin password reset remains available for support.</p>
      </Card>

      <Card className={overLimit ? "border-rose-200 bg-rose-50" : atLimit ? "border-amber-200 bg-amber-50" : "border-teal-200 bg-teal-50"}>
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-slate-950">Plan: {planLabel(firm.subscriptionPlan)}</p>
          <p className="text-sm leading-6 text-slate-700">Active users: {activeUsers.length} of {includedUserLimit > 0 ? includedUserLimit : "custom"} included</p>
          <p className="text-sm leading-6 text-slate-700">Inactive users do not count toward your plan.</p>
          <p className="text-sm leading-6 text-slate-700">Pending invited users count when they are active.</p>
          <p className="text-sm leading-6 text-slate-700">{planLimitMessage({ activeUserCount: activeUsers.length, includedUserLimit })}</p>
        </div>
      </Card>

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">User update not completed</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Active users" value={activeUsers.length} />
        <StatCard label="Inactive users" value={inactiveUsers.length} />
        <StatCard label="Owners" value={ownerUsers.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section title="Office users">
          <div className="grid gap-3">
            {users.map((user) => (
              <Card key={user.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{user.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{user.email} · Added {formatDate(user.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge>{labelFromEnum(user.role)}</Badge>
                    <Badge tone={user.active ? "green" : "slate"}>{user.active ? "Active" : "Inactive"}</Badge>
                    {user.userInvitationTokens.length > 0 ? <Badge tone="amber">Invite pending</Badge> : null}
                    {user.id === currentUser.id ? (
                      <Badge tone="teal">Current user</Badge>
                    ) : user.active ? (
                      <form action={resendUserInvite.bind(null, user.id)}>
                        <SubmitButton variant="secondary">Resend invite</SubmitButton>
                      </form>
                    ) : null}
                    {user.id === currentUser.id ? null : user.active ? (
                      <form action={setUserActive.bind(null, user.id, false)}>
                        <SubmitButton variant="secondary">Deactivate</SubmitButton>
                      </form>
                    ) : (
                      <form action={setUserActive.bind(null, user.id, true)}>
                        <SubmitButton>Activate</SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Add office user</h2>
          <form action={createUser} className="grid gap-3">
            <Field label="Name"><input name="name" required className={inputClassName} /></Field>
            <Field label="Email"><input name="email" type="email" required className={inputClassName} /></Field>
            <Field label="Role">
              <select name="role" defaultValue="ADJUSTER" className={selectClassName}>
                {userRoleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
              Active
            </label>
            <SubmitButton>Send invite</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
