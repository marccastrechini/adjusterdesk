import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireAuthenticatedAppContext } from "@/lib/app-context";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { firm, sessionUser, workspaceOverride } = await requireAuthenticatedAppContext();

  return (
    <AppShell
      firmName={firm.name}
      userName={sessionUser.name}
      userRole={sessionUser.role}
      isSystemAdmin={sessionUser.isSystemAdmin}
      workspaceOverride={workspaceOverride}
    >
      {children}
    </AppShell>
  );
}
