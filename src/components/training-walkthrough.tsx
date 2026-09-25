import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CtaBand, PublicButtonLink } from "@/components/public-site";
import {
  FOUNDING_ONBOARDING,
  FOUNDING_PAGE_HREF,
  FOUNDING_PRICE_LINE,
  FOUNDING_SOLO_SIGNUP_HREF,
  FOUNDING_SUPPORT_EMAIL,
  FOUNDING_TRIAL_DUE_LINE,
} from "@/lib/founding-offer";
import { trainingIndexPath, trainingModulePath, type TrainingModule, type TrainingStep } from "@/lib/training";

function stepAnchor(index: number) {
  return `step-${index + 1}`;
}

function stepLinkClassName() {
  return "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2";
}

function readPngSize(imageSrc: string) {
  const relative = imageSrc.replace(/^\//, "");
  const filePath = path.join(process.cwd(), "public", relative);
  const buffer = fs.readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function TrainingFigure({ step }: { step: TrainingStep }) {
  const { width, height } = readPngSize(step.imageSrc);

  return (
    <Image
      src={step.imageSrc}
      alt={step.alt}
      width={width}
      height={height}
      className="h-auto w-full bg-white"
      sizes="(min-width: 896px) 896px, 100vw"
    />
  );
}

function TrainingStepCard({
  step,
  index,
  total,
  previous,
  next,
}: {
  step: TrainingStep;
  index: number;
  total: number;
  previous: { href: string; label: string };
  next: { href: string; label: string };
}) {
  return (
    <figure id={stepAnchor(index)} className="scroll-mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <TrainingFigure step={step} />
      <figcaption className="border-t border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          Step {index + 1} of {total}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-950">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">{step.caption}</p>
        <nav aria-label={`Step ${index + 1} navigation`} className="mt-4 flex flex-wrap gap-2">
          <Link href={previous.href} className={stepLinkClassName()}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Previous: {previous.label}
          </Link>
          <Link href={next.href} className={stepLinkClassName()}>
            Next: {next.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </figcaption>
    </figure>
  );
}

export function TrainingWalkthrough({
  trainingModule,
  previousModule,
  nextModule,
}: {
  trainingModule: TrainingModule;
  previousModule?: TrainingModule;
  nextModule?: TrainingModule;
}) {
  const total = trainingModule.steps.length;

  return (
    <div className="grid max-w-4xl gap-8">
      <ol className="grid list-none gap-8 p-0">
        {trainingModule.steps.map((step, index) => {
          const previous =
            index === 0
              ? { href: trainingIndexPath, label: "All modules" }
              : { href: `#${stepAnchor(index - 1)}`, label: trainingModule.steps[index - 1].title };
          const next =
            index < total - 1
              ? { href: `#${stepAnchor(index + 1)}`, label: trainingModule.steps[index + 1].title }
              : nextModule
                ? { href: trainingModulePath(nextModule.slug), label: nextModule.title }
                : { href: trainingIndexPath, label: "All modules" };

          return (
            <li key={step.title}>
              <TrainingStepCard step={step} index={index} total={total} previous={previous} next={next} />
            </li>
          );
        })}
      </ol>

      <nav aria-label="Training modules" className="flex flex-wrap gap-2">
        {previousModule ? (
          <Link href={trainingModulePath(previousModule.slug)} className={stepLinkClassName()}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Previous module: {previousModule.title}
          </Link>
        ) : (
          <Link href={trainingIndexPath} className={stepLinkClassName()}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All modules
          </Link>
        )}
        {nextModule ? (
          <Link href={trainingModulePath(nextModule.slug)} className={stepLinkClassName()}>
            Next module: {nextModule.title}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link href={trainingIndexPath} className={stepLinkClassName()}>
            All modules
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}

export function TrainingClose() {
  return (
    <>
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            {FOUNDING_PRICE_LINE} {FOUNDING_TRIAL_DUE_LINE} Questions:{" "}
            <a href={`mailto:${FOUNDING_SUPPORT_EMAIL}`} className="font-medium text-teal-800 hover:text-teal-900">
              {FOUNDING_SUPPORT_EMAIL}
            </a>
            .
          </p>
          <PublicButtonLink href={FOUNDING_PAGE_HREF} variant="secondary" eventName="trial_start_click">
            See founding desk offer
          </PublicButtonLink>
        </div>
      </section>
      <CtaBand
        title="Put the first 10 active claims on the desk."
        description={FOUNDING_ONBOARDING}
        primaryHref={FOUNDING_SOLO_SIGNUP_HREF}
        primaryLabel="Start Solo founding desk"
      />
    </>
  );
}
