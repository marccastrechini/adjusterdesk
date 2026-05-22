import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getDemoContext } from "@/lib/app-context";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { firm, user } = await getDemoContext();

  return (
    <AppShell firmName={firm.name} userName={user.name} userRole={user.role}>
      {children}
    </AppShell>
  );
}
