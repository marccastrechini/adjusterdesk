"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ChartNoAxesColumn,
  CircleDollarSign,
  FileText,
  Inbox,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/claims", label: "Claims", icon: FileText },
  { href: "/money", label: "Money", icon: CircleDollarSign },
  { href: "/reports", label: "Reports", icon: ChartNoAxesColumn },
  { href: "/settings/templates", label: "Templates", icon: CalendarCheck },
  { href: "/settings/users", label: "Users", icon: Users },
  { href: "/settings/import", label: "CSV Import", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(item.href));
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
    </nav>
  );
}
