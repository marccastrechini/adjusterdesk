import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Pricing | AdjusterDesk",
  description: "Simple flat pricing for solo and small public adjusting offices.",
  path: "/pricing",
});

const plans = [
  {
    name: "Solo",
    price: "$49/month",
    description: "For independent public adjusters who want one simple place to manage claims, follow-ups, documents, client updates, and money.",
    features: [
      "1 active user",
      "Unlimited claims",
      "Today dashboard",
      "Leads and claims",
      "Documents",
      "Client status links",
      "Settlement, fee, and invoice tracking",
      "Templates & Checklists",
      "Email support",
    ],
    cta: "Start Free Trial",
    recommended: false,
  },
  {
    name: "Small Office",
    price: "$99/month",
    description: "For small public adjusting offices with an owner, admin, spouse, partner, or part-time helper.",
    features: [
      "Up to 3 active users",
      "Unlimited claims",
      "Everything in Solo",
      "Shared office workspace",
      "Team task ownership",
      "Office templates",
      "CSV import/export",
      "Priority email support during the early customer phase",
    ],
    cta: "Start Free Trial",
    recommended: true,
  },
  {
    name: "Team",
    price: "$199/month",
    description: "For growing offices with more adjusters or admin help.",
    features: [
      "Up to 7 active users",
      "Unlimited claims",
      "Everything in Small Office",
      "Team reporting",
      "Role permissions as they mature",
      "Workflow templates",
      "Export/accounting support as it matures",
      "Additional setup support",
    ],
    cta: "Request Demo",
    recommended: false,
  },
];

const faqs = [
  {
    question: "Can I try AdjusterDesk before paying?",
    answer: "Yes. Solo, Small Office, and Team include a 14-day free trial so you can see how AdjusterDesk fits your current claim workflow.",
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
    question: "How are users counted?",
    answer: "Plans use active-user limits. Inactive users stay in your office history and do not count. Pending invited users count when they are active because they are provisioned seats.",
  },
  {
    question: "What if I need more users?",
    answer: "Small Office includes up to 3 active users and Team includes up to 7 active users. Larger teams or custom limits can contact support for Professional/custom setup.",
  },
  {
    question: "Do you help import spreadsheets or older data?",
    answer: "Small Office and Team include CSV import/export. Professional/custom setup can include migration help for offices moving older data.",
  },
  {
    question: "Is billing automated in-app right now?",
    answer: "Not yet. Billing is managed manually in this phase while we keep onboarding high-touch for early customer offices.",
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
      <PublicSection title="Packages" description="Solo, Small Office, and Team are flat monthly plans. Professional/custom setup remains available by request.">
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
      <CtaBand title="Start simple, then grow with your office." description="Request trial access or a short demo to see which plan fits your current claims, clients, documents, follow-ups, payments, fees, and invoices." />
    </>
  );
}