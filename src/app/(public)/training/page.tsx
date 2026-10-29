import Link from "next/link";
import { TrainingClose } from "@/components/training-walkthrough";
import { PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { resolvePublicStartHref, resolvePublicStartLabel } from "@/lib/billing";
import { publicPageMetadata } from "@/lib/public-metadata";
import { trainingModulePath, trainingModules } from "@/lib/training";
import { brandName, supportEmail } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Training | ${brandName}`,
  description:
    `Walk through ${brandName} on your own. Today is the daily command center: what to follow up, what is waiting, what is due, and what is still unpaid.`,
  path: "/training",
});

export default function TrainingPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Training"
        title="Walk through the desk on your own time."
        description={`A public walkthrough for a 1–5 person public adjusting office. ${brandName} is the daily command center: what to follow up, what is waiting, what is due, and what is still unpaid. The screens are Demo Office. No sales call.`}
      />

      <PublicSection
        title="Three modules"
        description="Start with Today, then a lead, then the follow-up on an active claim. Each step is a Demo Office screenshot and a caption you can follow without a call."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {trainingModules.map((trainingModule, index) => (
            <article key={trainingModule.slug} className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-800">Module {index + 1}</p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">{trainingModule.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{trainingModule.summary}</p>
              <p className="mt-3 text-sm text-slate-500">
                {trainingModule.minutes} · {trainingModule.steps.length} steps
              </p>
              <div className="mt-4">
                <PublicButtonLink href={trainingModulePath(trainingModule.slug)} variant="primary">
                  {trainingModule.startLabel}
                </PublicButtonLink>
              </div>
            </article>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        title="Use it on your own claims"
        description={`These three modules are the public training. Start a free trial when you want ${brandName} on your office's files. Help answers common questions before you sign up. No sales call.`}
        tone="slate"
      >
        <div className="flex flex-wrap gap-3">
          <PublicButtonLink href={resolvePublicStartHref()} variant="primary" eventName="trial_start_click">
            {resolvePublicStartLabel()}
          </PublicButtonLink>
          <PublicButtonLink href="/help" variant="secondary">
            Open help
          </PublicButtonLink>
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-600">
          Already in the office?{" "}
          <Link href="/login" className="font-medium text-teal-800 hover:text-teal-900">
            Log in
          </Link>{" "}
          and open Today. Questions go to{" "}
          <a href={`mailto:${supportEmail}`} className="font-medium text-teal-800 hover:text-teal-900">
            {supportEmail}
          </a>
          .
        </p>
      </PublicSection>

      <TrainingClose />
    </>
  );
}
