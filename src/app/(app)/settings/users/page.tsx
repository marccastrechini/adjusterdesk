import { createUser } from "@/lib/actions";
import { formatDate, labelFromEnum } from "@/lib/format";
import { userRoleOptions } from "@/lib/options";
import { getUsers } from "@/lib/queries";
import { Badge, Card, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton } from "@/components/ui";

export default async function UsersPage() {
  const { users } = await getUsers();

  return (
    <>
      <PageHeader title="Users" description="Demo office users for assigning claims, tasks, documents, and communication notes." />

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
                  <div className="flex flex-wrap gap-2">
                    <Badge>{labelFromEnum(user.role)}</Badge>
                    <Badge tone={user.active ? "green" : "slate"}>{user.active ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Add demo user</h2>
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
            <SubmitButton>Add user</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
