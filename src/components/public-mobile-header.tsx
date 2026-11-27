"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { TrackedLink } from "@/components/tracked-link";

type NavItem = { href: string; label: string };

export function PublicMobileHeader({
  navItems,
  brandNameTM,
  brandTagline,
  foundingHref,
  supportEmail,
}: {
  navItems: NavItem[];
  brandNameTM: string;
  brandTagline: string;
  foundingHref: string;
  supportEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstLink = panelRef.current?.querySelector<HTMLElement>("a");
    firstLink?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setOpen(false);
      buttonRef.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="sm:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex min-w-0 flex-1 items-center gap-3 text-slate-950">
            <BrandMark />
            <span className="grid min-w-0">
              <span className="truncate text-base font-semibold">{brandNameTM}</span>
              <span className="truncate text-xs text-slate-500">{brandTagline}</span>
            </span>
          </Link>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            {open ? "Close" : "Menu"}
          </button>
        </div>

        <TrackedLink
          href={foundingHref}
          eventName="trial_start_click"
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        >
          Founding desk · $0/90 days
          <ArrowRight className="h-4 w-4" aria-hidden />
        </TrackedLink>

        <div ref={panelRef} id={panelId} hidden={!open} className="border-t border-slate-200 pt-2" onClick={() => setOpen(false)}>
          <nav aria-label="Public pages" className="grid">
            {navItems.map((item) =>
              item.href === "/pricing" ? (
                <TrackedLink
                  key={item.href}
                  href={item.href}
                  eventName="pricing_click"
                  className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800"
                >
                  {item.label}
                </TrackedLink>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="mt-2 grid gap-2 pb-1">
            <Link
              href={`mailto:${supportEmail}`}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              Email us
            </Link>
            <TrackedLink
              href="/login"
              eventName="login_click"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              Log in
            </TrackedLink>
          </div>
        </div>
      </div>
    </div>
  );
}
