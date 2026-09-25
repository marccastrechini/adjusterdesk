import Link from "next/link";
import { TrainingClose } from "@/components/training-walkthrough";
import { PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";
import { trainingComingSoon, trainingModulePath, trainingModules } from "@/lib/training";

export const metadata = publicPageMetadata({
  title: "Training | AdjusterDesk",
  description:
    "Walk through AdjusterDesk on your own. Today is the daily command center: what to follow up, what is waiting, what is due, and what is still unpaid.",
  path: "/training",
});

export default function TrainingPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Training"
        title="Walk through the desk on your own time."
        description="A public walkthrough for a 1–5 person public adjusting office. AdjusterDesk is the daily command center: what to follow up, what is waiting, what is due, and what is still unpaid. The screens are Demo Office. No sales call."
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

      <PublicSection title="Later" description="These two are not written yet. The three modules above are enough to see the daily desk." tone="slate">
        <div className="grid gap-4 md:grid-cols-2">
          {trainingComingSoon.map((stub) => (
            <article key={stub.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-800">Coming soon</p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">{stub.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{stub.summary}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-600">
          Already in the office?{" "}
          <Link href="/login" className="font-medium text-teal-800 hover:text-teal-900">
            Log in
          </Link>{" "}
          and open Today. Questions go to{" "}
          <a href="mailto:hello@adjusterdesk.xyz" className="font-medium text-teal-800 hover:text-teal-900">
            hello@adjusterdesk.xyz
          </a>
          .
        </p>
      </PublicSection>

      <TrainingClose />
    </>
  );
}
