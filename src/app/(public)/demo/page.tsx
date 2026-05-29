import { Mail } from "lucide-react";
import { PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Request Demo or Trial Access | AdjusterDesk",
  description: "Request an AdjusterDesk demo or trial access for a solo or small public adjusting office.",
  path: "/demo",
});

const demoFit = [
  "You track claims in spreadsheets, inboxes, paper files, folders, or accounting notes.",
  "You want one place for clients, claims, documents, follow-ups, payments, fees, and invoices.",
  "You run a solo practice or small public adjusting office and want a practical demo or trial walkthrough.",
];

const requestDetails = ["Name", "Office name", "Email", "Current setup", "Rough number of open claims"];

export default function DemoPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Request demo or trial access"
        title="See AdjusterDesk with a small-office workflow."
        description="Use a demo or 14-day trial request to compare AdjusterDesk against the way your office currently tracks leads, claims, documents, deadlines, settlement payments, fees, and invoices. No credit card required."
      />
      <PublicSection title="Request trial access">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">A good fit for the first demo</h2>
            <div className="mt-4 grid gap-3">
              {demoFit.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-2 h-2 w-2 flex-none rounded-full bg-teal-700" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Demo request details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Send a short email with the basics so trial access or a demo can focus on the way your office tracks claims today.</p>
            {/* TODO: Wire this placeholder to a server action or route handler when public demo-request submissions are ready. */}
            <div className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              {requestDetails.map((detail) => (
                <div key={detail} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 text-sm last:border-b-0 last:pb-0">
                  <span className="font-medium text-slate-950">{detail}</span>
                  <span className="text-slate-500">Include in email</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <a
                href="mailto:hello@adjusterdesk.xyz?subject=AdjusterDesk%20pilot%20demo%20request"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Email Demo Request
              </a>
            </div>
          </div>
        </div>
      </PublicSection>
      <section className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 pb-12 sm:px-6 lg:px-8">
          <PublicButtonLink href="/product" variant="secondary">
            View Product
          </PublicButtonLink>
          <PublicButtonLink href="/pricing" variant="secondary">
            View Pricing
          </PublicButtonLink>
        </div>
      </section>
    </>
  );
}