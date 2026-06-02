"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  BookOpen,
  ChartNoAxesColumn,
  CircleDollarSign,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const navItems: { label: string; items: NavItem[] }[] = [
  {
    label: "Office",
    items: [
      { href: "/start", label: "Start here", icon: ListChecks },
      { href: "/today", label: "Today", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: Inbox },
      { href: "/claims", label: "Claims", icon: FileText },
      { href: "/money", label: "Money", icon: CircleDollarSign },
      { href: "/reports", label: "Reports", icon: ChartNoAxesColumn },
      { href: "/office-resources", label: "Office Playbook", icon: BookOpen },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, exact: true },
      { href: "/settings/templates", label: "Templates", icon: CalendarCheck },
      { href: "/settings/users", label: "Users", icon: Users },
      { href: "/settings/import", label: "CSV import", icon: Settings },
      { href: "/feedback", label: "Feedback", icon: MessageSquare },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-5">
      {navItems.map((group) => (
        <div key={group.label} className="grid gap-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-normal text-slate-400">{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname === item.href || (item.href !== "/today" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                  active && "bg-teal-50 text-teal-800 hover:bg-teal-50 hover:text-teal-800",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
