"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClaimTabs({ claimId }: { claimId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/claims/${claimId}`, label: "Overview", exact: true },
    { href: `/claims/${claimId}/tasks`, label: "Tasks" },
    { href: `/claims/${claimId}/documents`, label: "Documents" },
    { href: `/claims/${claimId}/communications`, label: "Communications" },
    { href: `/claims/${claimId}/money`, label: "Money" },
    { href: `/claims/${claimId}/client-status`, label: "Client status" },
  ];

  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <nav className="flex min-w-max gap-5" aria-label="Claim sections">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-1 py-3 text-sm font-medium transition",
                active ? "border-teal-700 text-teal-800" : "border-transparent text-slate-500 hover:text-slate-950",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
