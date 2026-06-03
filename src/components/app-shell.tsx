import type { ReactNode } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { SubmitButton } from "@/components/ui";
import { TrialBanner } from "@/components/trial-banner";
import { exitSystemWorkspaceView } from "@/lib/actions";
import { logout } from "@/lib/auth-actions";
import { labelFromEnum } from "@/lib/format";

export function AppShell({
  children,
  firmName,
  userName,
  userRole,
  workspaceOverride,
  subscriptionStatus,
  trialEndsAt,
}: {
  children: ReactNode;
  firmName: string;
  userName: string;
  userRole: string;
  isSystemAdmin: boolean;
  workspaceOverride: { firmId: string; firmName: string } | null;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">AdjusterDesk</p>
              <p className="truncate text-xs text-slate-500">{firmName}</p>
            </div>
          </div>
          <div className="px-3 py-4">
            <SidebarNav />
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Workspace</p>
              <p className="text-sm font-semibold text-slate-950">{firmName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-right">
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Current user</p>
                <p className="text-sm font-semibold text-slate-950">{userName} · {labelFromEnum(userRole)}</p>
              </div>
              <form action={logout}>
                <SubmitButton variant="secondary">Log out</SubmitButton>
              </form>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6">
              {workspaceOverride ? (
                <div className="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">Viewing {workspaceOverride.firmName} as system admin.</p>
                  <form action={exitSystemWorkspaceView}>
                    <SubmitButton variant="secondary">Exit workspace view</SubmitButton>
                  </form>
                </div>
              ) : null}
              <TrialBanner firm={{ subscriptionStatus, trialEndsAt }} />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
