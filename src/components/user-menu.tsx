"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { logout } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

type MenuLink = {
  href: string;
  label: string;
};

type UserMenuProps = {
  userName: string;
  roleLabel: string;
  links: MenuLink[];
};

export function UserMenu({ userName, roleLabel, links }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-label={`${userName} ${roleLabel} account menu`}
        aria-expanded={isOpen}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-teal-300 hover:bg-slate-50",
        )}
      >
        <div className="min-w-0 text-right">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Account</p>
          <p className="truncate text-sm font-semibold text-slate-950">{userName}</p>
        </div>
        <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">{roleLabel}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", isOpen && "rotate-180")} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
        <div className="px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Signed in as</p>
          <p className="text-sm font-semibold text-slate-950">{userName}</p>
          <p className="text-xs text-slate-600">{roleLabel}</p>
        </div>

        <div className="my-2 border-t border-slate-200" />

        <div className="grid gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="my-2 border-t border-slate-200" />

        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Sign out
          </button>
        </form>
        </div>
      ) : null}
    </div>
  );
}