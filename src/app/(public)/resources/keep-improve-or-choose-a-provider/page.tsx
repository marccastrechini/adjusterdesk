import type { ReactNode } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { publicPageMetadata } from "@/lib/public-metadata";
import {
  resourceArticleAuthorName,
  resourceArticleCanonicalUrl,
  resourceArticleDescription,
  resourceArticlePath,
  resourceArticlePublished,
  resourceArticleTitle,
} from "@/lib/resource-article";
import { articleJsonLd } from "@/lib/structured-data";

const githubDocsUrl = "https://docs.github.com/en/copilot/tutorials/review-ai-generated-code";
const nistBasicsUrl = "https://www.nist.gov/itl/smallbusinesscyber/cybersecurity-basics";

export const metadata = publicPageMetadata({
  title: resourceArticleTitle,
  description: resourceArticleDescription,
  path: resourceArticlePath,
  article: {
    publishedTime: resourceArticlePublished,
    authors: [resourceArticleAuthorName],
  },
});

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-teal-800 underline decoration-teal-700/40 underline-offset-2 hover:text-teal-900"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="pt-6 text-2xl font-semibold leading-8 tracking-normal text-slate-950">{children}</h2>;
}

export default function KeepImproveOrChoosePage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: resourceArticleTitle,
          description: resourceArticleDescription,
          url: resourceArticleCanonicalUrl,
          datePublished: resourceArticlePublished,
          authorName: resourceArticleAuthorName,
        })}
      />
      <article>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-800">Article</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{resourceArticleTitle}</h1>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              Marc Castrechini, founder of PA ClaimBoard
              <span className="px-1 text-slate-400" aria-hidden="true">
                ·
              </span>
              <time dateTime={resourceArticlePublished}>November 2026</time>
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Written by the founder of PA ClaimBoard. We tried to give each option a fair shake.
            </p>
          </div>
        </header>

        <div className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-5 text-base leading-7 text-slate-700">
              <p>
                What needs attention today? Which claims are waiting on a carrier? Which checks or fees are still outstanding? Your office system should make those answers easy to find.
              </p>
              <p>
                You can keep a working setup, use AI to improve it, or choose a provider that uses AI to develop its software. Each can be a lasting choice.
              </p>
              <p>
                Before comparing them, list the tasks that matter most to your office. Judge each option by the work it handles, its total cost, and the effort it requires.
              </p>

              <Heading>Option 1: Stick with your existing system</Heading>
              <p>
                If it ain’t broke, don’t fix it. Your spreadsheet, shared calendar, custom tracker, or existing software subscription may already do the job well.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">The upside:</strong> you keep a proven routine, familiar records, and staff who know how to find what they need. You avoid migration and retraining, with no added software bill simply for staying put. That protects time for claims. Existing services may also improve without your office switching systems.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">The tradeoffs:</strong> familiarity can hide duplicate entry or steps nobody has written down. Review those when staff or workload changes. A clearer routine or division of responsibilities may resolve a gap without new software.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">This is right for you if…</strong> the setup handles your important tasks reliably, and a change offers no worthwhile improvement after accounting for disruption, cost, and effort.
              </p>

              <Heading>Option 2: Use AI to improve your own setup</Heading>
              <p>
                AI can help with a formula, a form, or a small tracker. An ordinary task is enough reason to experiment; you do not need an unusual workflow.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">The upside:</strong> you choose which problems to solve and how the result should work. You might add a list of checks awaiting mortgage-company endorsement while keeping everything else. If your existing tools cover it, you can experiment without another subscription. Templates and platform updates can also provide improvements you did not build.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">The tradeoffs:</strong> upkeep depends on scope. A formula in an existing spreadsheet adds different responsibilities from a custom app needing hosting, updates, and repairs. AI can help review changes and suggest tests; someone still checks the results. Decide what the underlying platform handles and what remains yours.{" "}
                <ExternalLink href={githubDocsUrl}>GitHub Docs</ExternalLink>
              </p>
              <p>
                <strong className="font-semibold text-slate-950">This is right for you if…</strong> there is a useful change to try, you can keep the experiment manageable, and someone inside or outside the office can support whatever you keep.
              </p>

              <Heading>Option 3: Work with a provider that uses AI on your behalf</Heading>
              <p>
                With this option, a provider uses AI to develop its software. Ask which hosting, updates, fixes, and support the service includes. Its use of AI alone tells you little about whether the product fits your office.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">The upside:</strong> the provider handles the technical work included in its service. There is also a shared-roadmap benefit: if another office requests a better way to track settlement payments and unpaid PA fees, and the provider builds and maintains it, you may benefit without doing that work yourself.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">The tradeoffs:</strong> fees, setup, migration, and training, plus ongoing recordkeeping and account administration. Your requests may wait while other customers’ priorities bring features you do not need. Compare the working product and actual support with your alternatives; promised features remain uncertain.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">This is right for you if…</strong> an available product fits your work, and the responsibilities it takes on justify its cost, the transition, and reliance on its support.
              </p>

              <Heading>Ask every option the same three questions</Heading>
              <p>
                <strong className="font-semibold text-slate-950">Security.</strong> NIST’s small-business guidance recommends multifactor authentication, software updates, and protected, tested backups. Who can see or change records? How do departing staff lose access? Who restores lost information? For AI services used by your office or a provider, ask whether client information is involved and how it is handled.{" "}
                <ExternalLink href={nistBasicsUrl}>NIST</ExternalLink>
              </p>
              <p>
                <strong className="font-semibold text-slate-950">Exit.</strong> Can you retrieve documents, notes, and their connections to claims in a usable form? Check current tools, the platform behind anything you build, and prospective providers. Try an export before depending on it.
              </p>
              <p>
                <strong className="font-semibold text-slate-950">Key person.</strong> Who takes over if the usual office administrator, builder, or vendor contact becomes unavailable? Look for clear instructions and backup help in each case.
              </p>

              <Heading>Try it on a fictional claim</Heading>
              <p>
                Start with your current setup. Run a made-up claim through it: add a document, assign a follow-up, record a partial payment, and retrieve the history. Have the person who uses it daily do the test. Note the effort, including correcting a mistake.
              </p>
              <p>
                Use those same tasks to assess any alternative. Keep experiments separate from live work, set a time limit, and retain a separate check on critical dates while testing reminders. If the experiment offers little benefit, keeping your current setup is a useful conclusion.
              </p>

              <Heading>Which one fits you?</Heading>
              <ul className="list-disc space-y-2 pl-5 marker:text-teal-700">
                <li>Which approach handles your essential tasks with acceptable cost and effort?</li>
                <li>
                  <strong className="font-semibold text-slate-950">Keep it</strong> when the current system works and changing brings no clear benefit.
                </li>
                <li>
                  <strong className="font-semibold text-slate-950">Improve it yourself</strong> when a manageable change solves a worthwhile problem.
                </li>
                <li>
                  <strong className="font-semibold text-slate-950">Choose a provider</strong> when a specific product and support arrangement justify the total cost and effort.
                </li>
                <li>
                  <strong className="font-semibold text-slate-950">Combine approaches</strong> when keeping most of your setup and changing one piece works best.
                </li>
              </ul>
              <p>Choose for the work your office actually does and the responsibilities you are willing to carry.</p>

              <p className="border-t border-slate-200 pt-6 text-sm italic leading-6 text-slate-600">
                Sponsor note: Marc Castrechini is the founder of PA ClaimBoard, a CRM for small public adjusting offices. PA ClaimBoard is looking for founding offices to help shape the product and responds quickly to feedback.
              </p>
              <p className="text-sm leading-6">
                <Link href="/resources" className="font-medium text-teal-800 hover:text-teal-900">
                  All resources
                </Link>
              </p>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
