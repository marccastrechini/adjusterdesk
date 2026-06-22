import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  ContactRound,
  FileText,
  HandCoins,
  Inbox,
  LayoutDashboard,
  ReceiptText,
  Upload,
  WalletCards,
} from "lucide-react";
import { TrackedLink } from "@/components/tracked-link";
import type { CTAEventName } from "@/lib/analytics";
import { resolvePublicStartHref, resolvePublicStartLabel } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const publicNavItems = [
  { href: "/product", label: "Product" },
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
  { href: "/free-public-adjuster-claim-tracker", label: "Free tracker" },
];

const startHref = resolvePublicStartHref();
const startLabel = resolvePublicStartLabel();

const trustNavItems = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/security", label: "Security" },
];

export const featureHighlights = [
  {
    title: "Claim tracking",
    description: "Keep each claim, carrier, policy number, loss type, status, and next step in one place.",
    icon: ClipboardList,
  },
  {
    title: "Client and contact organization",
    description: "Track the people, property details, phone numbers, emails, and assigned office user tied to the file.",
    icon: ContactRound,
  },
  {
    title: "Documents and notes",
    description: "Keep claim documents, photo notes, requests, call notes, emails, texts, meetings, and inspections close to the claim.",
    icon: FileText,
  },
  {
    title: "Follow-ups and deadlines",
    description: "See open tasks, overdue work, upcoming dates, missing documents, and carrier follow-ups before they slip.",
    icon: CalendarCheck,
  },
  {
    title: "Settlement and payment tracking",
    description: "Record demands, carrier offers, accepted settlements, checks, partial payments, and payment notes.",
    icon: HandCoins,
  },
  {
    title: "Fee and invoice tracking",
    description: "Track public adjuster fees, invoices, balances due, issued dates, due dates, and receivables.",
    icon: ReceiptText,
  },
];

export type PublicFeature = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function PublicSiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3 text-slate-950">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden />
            </span>
            <span className="grid">
              <span className="text-base font-semibold">AdjusterDesk</span>
              <span className="text-xs text-slate-500">For small public adjusting offices</span>
            </span>
          </Link>

          <nav aria-label="Public pages" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600">
            {publicNavItems.map((item) => (
              item.href === "/pricing" ? (
                <TrackedLink key={item.href} href={item.href} eventName="pricing_click" className="hover:text-teal-800">
                  {item.label}
                </TrackedLink>
              ) : (
                <Link key={item.href} href={item.href} className="hover:text-teal-800">
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <PublicButtonLink href={startHref} variant="primary" eventName="trial_start_click">
              {startLabel}
            </PublicButtonLink>
            <PublicButtonLink href="mailto:hello@adjusterdesk.xyz" variant="secondary">
              Email us
            </PublicButtonLink>
            <TrackedLink
              href="/login"
              eventName="login_click"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              Log in
            </TrackedLink>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-slate-950">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
                <BriefcaseBusiness className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-semibold">AdjusterDesk</span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              A simple workspace for small public adjusting offices to keep claims, clients, documents, follow-ups, payments, fees, and invoices together.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Already using AdjusterDesk? <TrackedLink href="/login" eventName="login_click" className="font-semibold text-teal-800 hover:text-teal-900">Log in.</TrackedLink>
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FooterLinks
              title="Product"
              items={[
                ...publicNavItems.slice(0, 3),
                { href: "/public-adjuster-software", label: "Public Adjuster Software" },
                { href: "/free-public-adjuster-claim-tracker", label: "Free Claim Tracker" },
              ]}
            />
            <FooterLinks title="Plan" items={[{ href: "/pricing", label: "Pricing" }, { href: "/resources", label: "Resources" }, { href: "/help", label: "Help" }, { href: startHref, label: startLabel }]} />
            <FooterLinks title="App" items={[{ href: "/login", label: "Log in" }, { href: "mailto:hello@adjusterdesk.xyz", label: "Email us" }]} />
            <FooterLinks title="Trust" items={trustNavItems} />
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterLinks({ title, items }: { title: string; items: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 grid gap-2 text-sm text-slate-600">
        {items.map((item) => (
          item.href === "/pricing" ? (
            <TrackedLink key={item.href} href={item.href} eventName="pricing_click" className="hover:text-teal-800">
              {item.label}
            </TrackedLink>
          ) : item.href === "/login" ? (
            <TrackedLink key={item.href} href={item.href} eventName="login_click" className="hover:text-teal-800">
              {item.label}
            </TrackedLink>
          ) : (
            <Link key={item.href} href={item.href} className="hover:text-teal-800">
              {item.label}
            </Link>
          )
        ))}
      </div>
    </div>
  );
}

export function PublicButtonLink({
  href,
  children,
  variant = "primary",
  eventName,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  eventName?: CTAEventName;
}) {
  if (eventName) {
    return (
      <TrackedLink
        href={href}
        eventName={eventName}
        className={cn(
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
          variant === "primary" ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        {children}
        {variant === "primary" ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
      </TrackedLink>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
        variant === "primary" ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {children}
      {variant === "primary" ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
    </Link>
  );
}

export function PublicHero({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-800">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PublicButtonLink href={startHref} variant="primary" eventName="trial_start_click">
              {startLabel}
            </PublicButtonLink>
            <PublicButtonLink href="mailto:hello@adjusterdesk.xyz" variant="secondary">
              Email us
            </PublicButtonLink>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Start your free trial now. No credit card required. Subscribe from Billing when you are ready. Already using AdjusterDesk? <TrackedLink href="/login" eventName="login_click" className="font-semibold text-teal-800 hover:text-teal-900">Log in.</TrackedLink>
          </p>
        </div>
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </section>
  );
}

export function PublicPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-normal text-teal-800">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
      </div>
    </section>
  );
}

export function PublicSection({ title, description, children, tone = "white" }: { title: string; description?: string; children: ReactNode; tone?: "white" | "slate" }) {
  return (
    <section className={tone === "white" ? "bg-white" : "bg-slate-50"}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h2>
          {description ? <p className="mt-3 text-base leading-7 text-slate-600">{description}</p> : null}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function FeatureGrid({ features }: { features: PublicFeature[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => (
        <FeatureCard key={feature.title} feature={feature} />
      ))}
    </div>
  );
}

export function FeatureCard({ feature }: { feature: PublicFeature }) {
  const Icon = feature.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-800">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
    </div>
  );
}

export function StepList({ steps }: { steps: Array<{ title: string; description: string }> }) {
  return (
    <div className="grid gap-3">
      {steps.map((step, index) => (
        <div key={step.title} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[4rem_1fr]">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-50 text-sm font-semibold text-sky-800">{index + 1}</div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CtaBand({ title, description }: { title: string; description: string }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{description}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <PublicButtonLink href={startHref} variant="primary" eventName="trial_start_click">
              {startLabel}
            </PublicButtonLink>
            <PublicButtonLink href="mailto:hello@adjusterdesk.xyz" variant="secondary">
              Email us
            </PublicButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkspacePreview() {
  const rows = [
    { label: "Call client about missing photos", detail: "Due today · Water claim · Dana" },
    { label: "Follow up with carrier desk adjuster", detail: "Tomorrow · Wind roof leak · Luis" },
    { label: "Record partial fee payment", detail: "$1,200 check · Invoice AD-1042" },
  ];
  const previewNavItems: PublicFeature[] = [
    { title: "Today", description: "", icon: LayoutDashboard },
    { title: "Leads", description: "", icon: Inbox },
    { title: "Claims", description: "", icon: ClipboardList },
    { title: "Money", description: "", icon: WalletCards },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-300" />
          <span className="h-3 w-3 rounded-full bg-amber-300" />
          <span className="h-3 w-3 rounded-full bg-emerald-300" />
        </div>
        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Today view</p>
      </div>
      <div className="grid lg:grid-cols-[14rem_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
          <div className="grid gap-2 text-sm font-medium text-slate-600">
            {previewNavItems.map((item) => {
              const PreviewIcon = item.icon;

              return (
                <div key={item.title} className={cn("flex items-center gap-2 rounded-md px-3 py-2", item.title === "Today" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600")}>
                  <PreviewIcon className="h-4 w-4" aria-hidden />
                  <span>{item.title}</span>
                </div>
              );
            })}
          </div>
        </aside>
        <div className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Overdue", "4"],
              ["Due today", "7"],
              ["Receivables", "$8,450"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">Work the office in this order</p>
            </div>
            <div className="divide-y divide-slate-200">
              {rows.map((row) => (
                <div key={row.label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-950">{row.label}</p>
                  <p className="text-sm text-slate-600">{row.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-700" aria-hidden />
          <p className="text-sm leading-6 text-slate-700">{item}</p>
        </div>
      ))}
    </div>
  );
}

export const extendedFeatureHighlights = [
  ...featureHighlights,
  {
    title: "Templates",
    description: "Start common follow-up tasks, document requests, and claim communication notes from simple office templates.",
    icon: CheckCircle2,
  },
  {
    title: "Spreadsheet import and onboarding",
    description: "Bring in basic lead and claim spreadsheets now, with guided onboarding planned for offices moving from older files.",
    icon: Upload,
  },
];