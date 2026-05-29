import type { Metadata } from "next";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Pricing | AdjusterDesk",
  description: "Simple AdjusterDesk pricing for solo and small public adjusting offices.",
};

const plans = [
  {
    name: "Starter",
    price: "$49/month",
    description: "For solo public adjusters getting organized.",
    features: [
      "1 user",
      "Claims, clients, notes, documents, follow-ups, and deadlines",
      "Settlement and fee tracking",
      "Basic reports",
      "Templates",
      "Email support",
      "14-day free trial",
    ],
    cta: "Start Free Trial",
    recommended: false,
  },
  {
    name: "Small Office",
    price: "$129/month",
    description: "For small public adjusting offices that need one shared workspace.",
    features: [
      "Up to 3 users",
      "Everything in Starter",
      "Team follow-up and deadline visibility",
      "CSV import/export",
      "Shared templates",
      "Priority email support",
      "Additional users: $29/user/month",
    ],
    cta: "Start Free Trial",
    recommended: true,
  },
  {
    name: "Professional",
    price: "Custom pricing",
    description: "For larger teams, migration help, or firms that need extra setup support.",
    features: [
      "Everything in Small Office",
      "Custom onboarding",
      "Spreadsheet/data migration assistance",
      "Advanced reporting or workflow configuration",
      "Custom templates",
      "Dedicated setup support",
    ],
    cta: "Request Demo",
    recommended: false,
  },
];

const faqs = [
  {
    question: "Can I try AdjusterDesk before paying?",
    answer: "Yes. Starter and Small Office include a 14-day free trial so you can see how AdjusterDesk fits your current claim workflow.",
  },
  {
    question: "Do I need a credit card?",
    answer: "No. The 14-day free trial does not require a credit card. Start Free Trial sends you to request trial access so setup can be confirmed before a workspace is opened.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. You can start with the plan that fits your office now and move as your user count or setup needs change.",
  },
  {
    question: "What if I have more than 3 users?",
    answer: "Small Office includes up to 3 users, with additional users at $29/user/month. Larger teams can use Professional when they need extra setup, migration, or workflow support.",
  },
  {
    question: "Do you help import spreadsheets?",
    answer: "Small Office includes CSV import/export. Professional can include spreadsheet or data migration assistance for firms that want more help moving older files.",
  },
  {
    question: "What is the Professional plan for?",
    answer: "Professional is for larger teams, migration help, custom templates, advanced reporting or workflow configuration, and dedicated setup support.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Pricing"
        title="Simple plans for small public adjusting offices."
        description="Choose the package that matches how your office works today. Start with a 14-day free trial. No credit card required."
      />
      <PublicSection title="Packages" description="Starter and Small Office are built for self-serve, low-overhead setup. Professional is for firms that need more hands-on help.">
        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={plan.recommended ? "relative rounded-lg border-2 border-teal-700 bg-white p-5 shadow-sm" : "rounded-lg border border-slate-200 bg-white p-5 shadow-sm"}
            >
              {plan.recommended ? (
                <div className="absolute right-4 top-4 rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-white">Recommended</div>
              ) : null}
              <div className="grid min-h-full gap-5">
                <div>
                  <h2 className="pr-28 text-lg font-semibold text-slate-950 lg:pr-0">{plan.name}</h2>
                  <p className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{plan.price}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                </div>
                <ul className="grid gap-3 text-sm leading-6 text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 flex-none rounded-full bg-teal-700" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="self-end">
                  <PublicButtonLink href="/demo" variant={plan.recommended ? "primary" : "secondary"}>
                    {plan.cta}
                  </PublicButtonLink>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-teal-200 bg-teal-50 p-5">
          <h2 className="text-base font-semibold text-slate-950">14-day free trial. No credit card required.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            Start Free Trial routes to the request access flow so setup can be confirmed before a workspace is opened. It does not create an account automatically or start paid billing.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <PublicButtonLink href="/demo" variant="primary">
              Start Free Trial
            </PublicButtonLink>
            <PublicButtonLink href="/demo" variant="secondary">
              Request Demo
            </PublicButtonLink>
          </div>
        </div>
      </PublicSection>
      <PublicSection title="Pricing FAQ" tone="slate">
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">{faq.question}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </PublicSection>
      <CtaBand title="Start simple, then add help when your office needs it." description="Request trial access or a short demo to see which package fits your current claims, clients, documents, follow-ups, payments, fees, and invoices." />
    </>
  );
}