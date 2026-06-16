import {
  inviteSystemOutreachOperator,
  resendSystemUserInviteFromUsersPage,
  setSystemUserActiveFromUsersPage,
  setSystemUserOutreachOperatorFromUsersPage,
} from "@/lib/actions";
import { requireSystemAdminContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { getSystemUsers } from "@/lib/queries";
import { Badge, ButtonLink, Card, Field, Notice, PageHeader, Section, SubmitButton, inputClassName } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function twoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateUtc(date?: Date | string | null) {
  if (!date) return "—";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  return `${value.getUTCFullYear()}-${twoDigits(value.getUTCMonth() + 1)}-${twoDigits(value.getUTCDate())}`;
}

export default async function SystemUsersPage({ searchParams }: PageProps) {
  await requireSystemAdminContext();
  const params = await searchParams;
  const notice = getNoticeMessage(params);
  const error = firstValue(params.error);
  const users = await getSystemUsers();

  const errorMessage =
    error === "user-missing"
      ? "That user was not found."
      : error === "last-admin"
        ? "Cannot disable the only active system admin."
        : error === "self-disable"
          ? "You cannot disable your own account from this page."
          : error === "system-admin-flag"
            ? "The outreach operator flag cannot be changed on system admin accounts."
            : error === "invite-send"
              ? "Invite could not be sent. Check system email setup and try again."
              : undefined;

  return (
    <>
      <PageHeader
        title="System users"
        description="All user accounts across this install. Enable/disable accounts and manage the outreach operator role."
        actions={<ButtonLink href="/system" variant="secondary">System dashboard</ButtonLink>}
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Action not completed</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}

      <Section
        title="Invite outreach operator"
        description="Create a new outreach operator account or upgrade an existing account. The invite email is sent on creation."
      >
        <Card>
          <form action={inviteSystemOutreachOperator} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="returnTo" value="/system/users" />
            <Field label="Name" required>
              <input name="name" required className={inputClassName} />
            </Field>
            <Field label="Email" required>
              <input name="email" type="email" required className={inputClassName} />
            </Field>
            <div className="md:col-span-2 xl:col-span-2">
              <Field label="Note (optional)" hint="Included in the invite email when provided.">
                <input name="note" maxLength={300} className={inputClassName} />
              </Field>
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <SubmitButton>Invite outreach operator</SubmitButton>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="All users" description="Accounts across all workspaces. System admin status is read-only.">
        <Card className="overflow-x-auto">
          <table className="min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                <th scope="col" className="px-2 py-2 font-semibold">Name</th>
                <th scope="col" className="px-2 py-2 font-semibold">Email</th>
                <th scope="col" className="px-2 py-2 font-semibold">Workspace</th>
                <th scope="col" className="px-2 py-2 font-semibold">Active</th>
                <th scope="col" className="px-2 py-2 font-semibold">System Admin</th>
                <th scope="col" className="px-2 py-2 font-semibold">Outreach Op</th>
                <th scope="col" className="px-2 py-2 font-semibold">Invite</th>
                <th scope="col" className="px-2 py-2 font-semibold">Created</th>
                <th scope="col" className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-6 text-center text-sm text-slate-600">No users found.</td>
                </tr>
              ) : (
                users.map((user) => {
                  const hasPendingInvite = user.userInvitationTokens.length > 0;
                  return (
                    <tr key={user.id} className="border-b border-slate-100 align-top text-slate-700 last:border-b-0">
                      <td className="px-2 py-2 font-medium text-slate-950">{user.name}</td>
                      <td className="px-2 py-2 text-xs">{user.email}</td>
                      <td className="px-2 py-2 text-xs text-slate-500">{user.firm.name}</td>
                      <td className="px-2 py-2">
                        {user.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}
                      </td>
                      <td className="px-2 py-2">
                        {user.isSystemAdmin ? <Badge tone="blue">Admin</Badge> : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2">
                        {user.isSystemAdmin ? (
                          <span className="text-xs text-slate-400">N/A</span>
                        ) : user.isOutreachOperator ? (
                          <Badge tone="amber">Outreach</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {hasPendingInvite ? <Badge tone="amber">Pending</Badge> : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-500">{formatDateUtc(user.createdAt)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          {user.active ? (
                            <form action={setSystemUserActiveFromUsersPage.bind(null, user.id, false)}>
                              <SubmitButton variant="secondary">Disable</SubmitButton>
                            </form>
                          ) : (
                            <form action={setSystemUserActiveFromUsersPage.bind(null, user.id, true)}>
                              <SubmitButton variant="secondary">Enable</SubmitButton>
                            </form>
                          )}
                          {!user.isSystemAdmin && (
                            user.isOutreachOperator ? (
                              <form action={setSystemUserOutreachOperatorFromUsersPage.bind(null, user.id, false)}>
                                <SubmitButton variant="secondary">Remove outreach</SubmitButton>
                              </form>
                            ) : (
                              <form action={setSystemUserOutreachOperatorFromUsersPage.bind(null, user.id, true)}>
                                <SubmitButton variant="secondary">Add outreach</SubmitButton>
                              </form>
                            )
                          )}
                          {hasPendingInvite && (
                            <form action={resendSystemUserInviteFromUsersPage.bind(null, user.id)}>
                              <SubmitButton variant="secondary">Resend invite</SubmitButton>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </Section>
    </>
  );
}
