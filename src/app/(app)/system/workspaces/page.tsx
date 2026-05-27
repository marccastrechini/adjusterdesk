import { createSystemWorkspaceWithOwner } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { getSystemWorkspaces } from "@/lib/queries";
import { ButtonLink, Card, Field, Notice, PageHeader, Section, SubmitButton, inputClassName } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SystemWorkspacesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const notice = getNoticeMessage(params);
  const error = firstValue(params.error);
  const workspaces = await getSystemWorkspaces();

  const errorMessage =
    error === "workspace-password"
      ? "Owner password must be at least 8 characters."
      : error === "workspace-owner-email"
        ? "A user with that owner email already exists."
        : error === "workspace-name"
          ? "A workspace with that name already exists."
          : undefined;

  return (
    <>
      <PageHeader
        title="System workspaces"
        description="Global local-admin view for workspace provisioning and ownership details."
        actions={<ButtonLink href="/system">System dashboard</ButtonLink>}
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Workspace update not completed</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}

      <Section title="Create workspace and owner">
        <Card>
          <form action={createSystemWorkspaceWithOwner} className="grid gap-3 md:grid-cols-2">
            <Field label="Workspace name" required><input name="workspaceName" required className={inputClassName} /></Field>
            <Field label="Owner name" required><input name="ownerName" required className={inputClassName} /></Field>
            <Field label="Owner email" required><input name="ownerEmail" type="email" required className={inputClassName} /></Field>
            <Field label="Owner password" required hint="Set a temporary password and rotate after first sign-in."><input name="ownerPassword" type="password" minLength={8} required className={inputClassName} /></Field>
            <div className="md:col-span-2">
              <SubmitButton>Create workspace</SubmitButton>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Workspace list" description="Names, owner account, user totals, lead totals, and claim totals.">
        <div className="grid gap-3">
          {workspaces.map((workspace) => {
            const owner = workspace.users[0];

            return (
              <Card key={workspace.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{workspace.name}</p>
                    <p className="mt-1 text-sm text-slate-600">Created {formatDate(workspace.createdAt)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Owner: {owner ? `${owner.name} (${owner.email})` : "No owner user"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm text-slate-700">
                    <p>Users: <span className="font-semibold text-slate-950">{workspace._count.users}</span></p>
                    <p>Leads: <span className="font-semibold text-slate-950">{workspace._count.leads}</span></p>
                    <p>Claims: <span className="font-semibold text-slate-950">{workspace._count.claims}</span></p>
                  </div>
                  <div>
                    <ButtonLink href={`/system/workspaces/${workspace.id}`} variant="secondary">Open workspace</ButtonLink>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>
    </>
  );
}
