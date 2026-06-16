import { createSystemWorkspaceWithOwner, enterSystemWorkspaceView } from "@/lib/actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { getSystemActivationRows, getSystemWorkspaces } from "@/lib/queries";
import { ButtonLink, Card, Field, Notice, PageHeader, Section, SubmitButton, inputClassName } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function classifyWorkspaceName(name: string) {
  if (/smoke|test/i.test(name)) {
    return "Smoke/Test";
  }

  if (/demo/i.test(name)) {
    return "Demo";
  }

  return null;
}

export default async function SystemWorkspacesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const notice = getNoticeMessage(params);
  const error = firstValue(params.error);
  const [workspaces, activationRows] = await Promise.all([getSystemWorkspaces(), getSystemActivationRows()]);

  const errorMessage =
    error === "workspace-owner-email"
        ? "A user with that owner email already exists."
        : error === "workspace-name"
          ? "A workspace with that name already exists."
        : error === "invite-send"
          ? "Workspace was not created because the invite email could not be sent. Check system email setup and try again."
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
            <Field label="Onboarding method" required>
              <select name="bootstrapMode" defaultValue="invite" className={inputClassName}>
                <option value="invite">Send invite email (recommended)</option>
                <option value="temporary">Use temporary bootstrap password</option>
              </select>
            </Field>
            <Field label="Bootstrap password" hint="Used only when onboarding method is temporary. Leave blank to auto-generate a one-time password.">
              <input name="ownerPassword" type="password" minLength={8} className={inputClassName} />
            </Field>
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
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      {classifyWorkspaceName(workspace.name) ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">{classifyWorkspaceName(workspace.name)}</span>
                      ) : null}
                      {workspace.signupSource ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">Source: {workspace.signupSource}</span>
                      ) : null}
                    </div>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={enterSystemWorkspaceView.bind(null, workspace.id)}>
                        <SubmitButton>Enter workspace</SubmitButton>
                      </form>
                      <ButtonLink href={`/system/workspaces/${workspace.id}`} variant="secondary">Open workspace</ButtonLink>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section
        title="Activation visibility"
        description="Recent workspace signups with practical activation signals for daily operator review."
      >
        <Card className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                  <th scope="col" className="px-2 py-2 font-semibold">Workspace</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Primary user</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Signup/created</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Last activity</th>
                  <th scope="col" className="px-2 py-2 font-semibold">First lead</th>
                  <th scope="col" className="px-2 py-2 font-semibold">First claim</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Leads</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Claims</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Welcome email</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Source/referrer</th>
                </tr>
              </thead>
              <tbody>
                {activationRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top text-slate-700 last:border-b-0">
                    <td className="px-2 py-2">
                      <p className="font-medium text-slate-950">{row.workspaceName}</p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{row.primaryUserName ?? "No owner user"}</p>
                      <p className="text-xs text-slate-500">{row.primaryUserEmail ?? "No email"}</p>
                    </td>
                    <td className="px-2 py-2">{formatDateTime(row.signupOrCreatedAt)}</td>
                    <td className="px-2 py-2">{row.lastActivityAt ? formatDateTime(row.lastActivityAt) : "Not tracked"}</td>
                    <td className="px-2 py-2">{row.firstLeadExists ? "Yes" : "No"}</td>
                    <td className="px-2 py-2">{row.firstClaimExists ? "Yes" : "No"}</td>
                    <td className="px-2 py-2">{row.leadCount}</td>
                    <td className="px-2 py-2">{row.claimCount}</td>
                    <td className="px-2 py-2">{row.welcomeEmailStatus}</td>
                    <td className="px-2 py-2">
                      <p>{row.source ?? "Not tracked"}</p>
                      <p className="text-xs text-slate-500">{row.referrerOrUtm ?? "No referrer/UTM captured"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <p className="font-semibold text-slate-700">Tracking notes</p>
            <p>Welcome email delivery status is not currently persisted. Last login timestamp is not currently stored.</p>
            <p>Source/referrer depends on existing fields: workspace signup source and signup intent source when present.</p>
          </div>
        </Card>
      </Section>
    </>
  );
}
