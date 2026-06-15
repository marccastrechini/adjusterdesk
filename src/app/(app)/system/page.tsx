import { Badge, ButtonLink, Card, PageHeader, StatCard } from "@/components/ui";
import { getSystemDashboardData } from "@/lib/queries";

export default async function SystemDashboardPage() {
  const { workspaceCount, activeUserCount, installStatus } = await getSystemDashboardData();

  return (
    <>
      <PageHeader
        title="System admin"
        description="Local-only global admin tools for workspace and user management across this AdjusterDesk install."
        actions={
          <>
            <ButtonLink href="/system/emails" variant="secondary">System emails</ButtonLink>
            <ButtonLink href="/system/workspaces">Open workspaces</ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Workspaces" value={workspaceCount} />
        <StatCard label="Active users" value={activeUserCount} />
        <StatCard label="Auth status" value={installStatus.realAuth} />
        <StatCard label="Database" value={installStatus.productionDatabase} />
      </div>

      <Card className="grid gap-4">
        <h2 className="text-base font-semibold text-slate-950">Local install status</h2>
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-center gap-2">
            <dt className="text-sm text-slate-600">Node environment</dt>
            <dd><Badge tone="blue">{installStatus.nodeEnv}</Badge></dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-sm text-slate-600">Real auth</dt>
            <dd>
              <Badge tone={installStatus.realAuth === "Active" ? "green" : installStatus.realAuth === "Configured" ? "blue" : "amber"}>
                {installStatus.realAuth}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-sm text-slate-600">Database</dt>
            <dd><Badge tone={installStatus.productionDatabase === "External database" ? "green" : "amber"}>{installStatus.productionDatabase}</Badge></dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-sm text-slate-600">Local file storage</dt>
            <dd><Badge tone="amber">{installStatus.localFileStorage}</Badge></dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-sm text-slate-600">Public status links</dt>
            <dd><Badge tone="blue">{installStatus.publicStatusLinks}</Badge></dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-sm text-slate-600">Demo workspace mode</dt>
            <dd><Badge tone={installStatus.demoWorkspaceMode === "On" ? "amber" : "green"}>{installStatus.demoWorkspaceMode}</Badge></dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
