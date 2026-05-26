import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireAuthenticatedAppContext } from "@/lib/app-context";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { firm, user } = await requireAuthenticatedAppContext();

  return (
    <AppShell firmName={firm.name} userName={user.name} userRole={user.role}>
      {children}
    </AppShell>
  );
}
