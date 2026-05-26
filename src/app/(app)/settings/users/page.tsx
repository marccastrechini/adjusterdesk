import { createUser, setUserActive } from "@/lib/actions";
import { formatDate, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { userRoleOptions } from "@/lib/options";
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
  const { users, user: currentUser } = await getUsers();
  const activeUsers = users.filter((entry) => entry.active);
  const inactiveUsers = users.filter((entry) => !entry.active);
  const ownerUsers = users.filter((entry) => entry.role === "OWNER");

  const errorMessage =
    error === "current-user"
      ? "You cannot deactivate the current signed-in user."
      : error === "last-owner"
        ? "You cannot deactivate the last active owner in this office."
        : error === "missing"
          ? "That user was not found in this office."
          : error === "password"
            ? "New office users need a password that is at least 8 characters long."
          : undefined;

  return (
    <>
      <PageHeader title="Users" description="Office users for signing in and assigning claims, tasks, documents, and communication notes." />
      <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
        <p className="font-semibold">Office sign-in users</p>
        <p className="mt-1 leading-6">These users can sign in with email and password. OAuth, invites, password reset, and firm switching are still outside this MVP.</p>
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
                    {user.id === currentUser.id ? (
                      <Badge tone="teal">Current user</Badge>
                    ) : user.active ? (
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
            <Field label="Password" hint="Set a temporary password the office can share with this user."><input name="password" type="password" minLength={8} required className={inputClassName} /></Field>
            <Field label="Role">
              <select name="role" defaultValue="ADJUSTER" className={selectClassName}>
                {userRoleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
              Active
            </label>
            <SubmitButton>Add user</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
