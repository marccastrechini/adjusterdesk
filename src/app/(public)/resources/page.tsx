import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { resolvePublicStartHref, resolvePublicStartLabel } from "@/lib/billing";
import { FOUNDING_PAGE_HREF, FOUNDING_PRICE_LINE, FOUNDING_STANDARD_COMPARE, TRACKER_PAGE_HREF } from "@/lib/founding-offer";
import { publicPageMetadata } from "@/lib/public-metadata";
import { brandName, supportEmail } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Resources | ${brandName}`,
  description: `Training, help, the founding desk offer, and a free claim tracker for small public adjusting offices using ${brandName}.`,
  path: "/resources",
});

const availableResources = [
  {
    title: "Founding office offer",
    description: `${FOUNDING_PRICE_LINE} ${FOUNDING_STANDARD_COMPARE} Start with your first 10 active claims.`,
    href: FOUNDING_PAGE_HREF,
    label: "View founding desk offer",
  },
  {
    title: "Training walkthrough",
    description: "Walk through Today, a lead turning into a claim, and follow-ups on an active claim. Read it on your own time.",
    href: "/training",
    label: "Open training",
  },
  {
    title: "Help",
    description: `Plain answers about ${brandName}, including who it is for, spreadsheet import, fees and invoices, and what to do first after signup.`,
    href: "/help",
    label: "Open help",
  },
  {
    title: "Free claim tracker",
    description: "A spreadsheet for leads, follow-ups, documents, settlements, and fees, if you want a file before the desk.",
    href: TRACKER_PAGE_HREF,
    label: "Open the free tracker",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Resources"
        title="Practical resources for small public adjusting offices."
        description={`Published here: the training walkthrough, help answers, the founding desk offer, and a free claim tracker. ${brandName} is self-serve. Start a free trial when you want the desk itself.`}
      />
      <PublicSection title="Available now" description="These pages are live. Open the one that matches what you need next.">
        <div className="grid gap-4 md:grid-cols-2">
          {availableResources.map((resource) => (
            <div key={resource.title} className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-800">Available now</p>
              <h2 className="mt-2 text-base font-semibold text-slate-950">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{resource.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <PublicButtonLink href={resource.href} variant="secondary">
                  {resource.label}
                </PublicButtonLink>
              </div>
            </div>
          ))}
        </div>
      </PublicSection>
      <PublicSection
        title="Then use the desk"
        description={`Start Here and the Office Playbook are inside ${brandName} after signup, including spreadsheet import. This page does not publish separate setup articles, checklists, or template packs.`}
        tone="slate"
      >
        <div className="flex flex-wrap gap-3">
          <PublicButtonLink href={resolvePublicStartHref()} variant="primary" eventName="trial_start_click">
            {resolvePublicStartLabel()}
          </PublicButtonLink>
          <PublicButtonLink href="/help" variant="secondary">
            Read help
          </PublicButtonLink>
        </div>
      </PublicSection>
      <CtaBand
        title="Ready to use the desk?"
        description={`Start a free trial on your own. Questions about your office workflow go to ${supportEmail}.`}
      />
    </>
  );
}
