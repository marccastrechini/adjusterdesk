import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { requireAuthenticatedAppContext } from "@/lib/app-context";

export const dynamic = "force-dynamic";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { firm, sessionUser, workspaceOverride } = await requireAuthenticatedAppContext();

  return (
    <div className={geistMono.variable}>
      <AppShell
        firmName={firm.name}
        userName={sessionUser.name}
        userRole={sessionUser.role}
        isSystemAdmin={sessionUser.isSystemAdmin}
        workspaceOverride={workspaceOverride}
      >
        {children}
      </AppShell>
    </div>
  );
}
