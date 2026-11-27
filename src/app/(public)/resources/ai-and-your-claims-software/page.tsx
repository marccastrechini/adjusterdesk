import type { ReactNode } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { canonicalOrigin } from "@/lib/brand";
import { publicPageMetadata } from "@/lib/public-metadata";
import {
  resourceArticleAuthorName,
  resourceArticleCanonicalUrl,
  resourceArticleDescription,
  resourceArticleModified,
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

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <strong className="font-semibold text-slate-950">{label}</strong> {children}
    </p>
  );
}

export default function AiAndYourClaimsSoftwarePage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: resourceArticleTitle,
          description: resourceArticleDescription,
          url: resourceArticleCanonicalUrl,
          datePublished: resourceArticlePublished,
          dateModified: resourceArticleModified,
          authorName: resourceArticleAuthorName,
        })}
      />
      <article>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-800">Sponsored content</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{resourceArticleTitle}</h1>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {resourceArticleAuthorName}
              <span className="px-1 text-slate-400" aria-hidden="true">
                ·
              </span>
              <time dateTime={resourceArticlePublished}>November 2026</time>
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Written by the team behind PA ClaimBoard. We’ve tried to describe every path fairly, including the ones that don’t involve us.
            </p>
          </div>
        </header>

        <div className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-5 text-base leading-7 text-slate-700">
              <p>
                Most PA offices already use AI somewhere, like drafting letters or summarizing policies. The harder question is what to do about the system that holds your claims: the spreadsheet, tracker, or software that tells you which files are waiting on a carrier, which checks are out for endorsement, and which fees are still unpaid.
              </p>
              <p>
                There are four reasonable ways to approach it. None is the “right” answer for every office. Before comparing them, write down the five or six tasks your claims system must handle well, and judge every option by those tasks, its total cost, and the effort it asks of you.
              </p>

              <Heading>Option 1: Stick with what you have</Heading>
              <Detail label="What it looks like:">
                you keep your current spreadsheet, shared calendar, custom tracker, or software subscription as it is. AI may help elsewhere in the office, but your claims system stays put.
              </Detail>
              <Detail label="The upside:">
                a proven routine, familiar records, and staff who know where everything is. No migration, no retraining, no new bill. Your current tools may also add AI features without you switching.
              </Detail>
              <Detail label="The tradeoffs:">
                familiar systems can hide duplicate entry or steps nobody has written down. Revisit them when staff or workload changes. Often a clearer routine fixes a gap without any new tool.
              </Detail>
              <Detail label="This fits if…">
                your system handles your important tasks reliably and no change offers a worthwhile improvement after counting disruption, cost, and effort. If that’s you, you’re in good shape. It is what it is, and that’s fine.
              </Detail>

              <Heading>Option 2: Use AI to tune up your current software</Heading>
              <Detail label="What it looks like:">
                you keep your system and use an AI assistant to get more out of it. Ask it to write a spreadsheet formula, build a report from an export, draft a checklist, summarize a claim’s notes, or explain a feature you never figured out.
              </Detail>
              <Detail label="The upside:">
                cheap and low-risk. You pick the problem, such as a weekly list of checks awaiting mortgage-company endorsement, and leave everything else alone. If it doesn’t help, you’ve lost an afternoon.
              </Detail>
              <Detail label="The tradeoffs:">
                results need checking; AI can produce a formula that looks right and isn’t. Be careful about pasting client information into AI tools; check what the tool does with it first. Small fixes can also pile up into a patchwork that only one person understands.
              </Detail>
              <Detail label="This fits if…">
                there’s a specific annoyance worth an experiment and someone can check the results. If it makes you better, great. Many offices will stop here, and that’s a sound decision.
              </Detail>

              <Heading>Option 3: Use AI to build your own custom system</Heading>
              <Detail label="What it looks like:">
                with today’s AI coding tools, you (or a hired helper) describe what you want and build a claims system shaped exactly to your office: your stages, your fee rules, your reports.
              </Detail>
              <Detail label="The upside:">
                it fits exactly, you own it, and there’s no subscription to a vendor. You decide what gets built next and when. Building software this way is far more realistic than it was a few years ago.
              </Detail>
              <Detail label="The tradeoffs:">
                building is the easy part; running it is the ongoing job. Someone has to handle hosting, logins, security updates, backups, and fixes when something breaks. AI can help review code and suggest tests, but a person still has to check the results (<ExternalLink href={githubDocsUrl}>GitHub Docs</ExternalLink>). Your time spent maintaining it is a real cost.
              </Detail>
              <Detail label="This fits if…">
                you want an exact fit and ownership, and you have the interest, time, or a trusted helper to keep it hosted, secure, and backed up for years, not weeks.
              </Detail>

              <Heading>Option 4: Use a provider whose software uses AI for you</Heading>
              <Detail label="What it looks like:">
                you subscribe to claims software from a company that builds AI features into the product and uses AI to develop it, while handling the hosting and upkeep.
              </Detail>
              <Detail label="The upside:">
                less for you to maintain. The provider handles hosting, updates, and fixes included in its service. You also share a roadmap: if another office asks for better tracking of settlement payments and unpaid PA fees and the provider builds it, you may benefit without doing that work.
              </Detail>
              <Detail label="The tradeoffs:">
                it costs money every month, and you depend on a vendor’s priorities, support, and staying in business. It fits less exactly than something you built; your requests may wait while features you don’t need arrive. Setup and migration take time too. Judge the working product and actual support, not promised features.
              </Detail>
              <Detail label="This fits if…">
                a specific product handles your essential tasks today, and what it takes off your plate justifies its cost, the switch, and relying on someone else.
              </Detail>

              <Heading>The real decision: 3 or 4</Heading>
              <p>
                If option 1 or 2 covers you, you can stop reading. For offices that want more, the choice is usually between building your own and using a provider. Neither is the safe or modern choice by default. It comes down to what you’d rather carry: the work of running your own system, or the cost and dependence of using someone else’s.
              </p>
              <Detail label="Questions for building your own:">
                Who will maintain it in two years? What happens when that person is busy or gone? How much time per month will upkeep really take?
              </Detail>
              <Detail label="Questions for a provider:">
                Does the product handle your essential tasks today? What does it cost over three years, including setup? How quickly does support actually respond?
              </Detail>
              <p>
                <strong className="font-semibold text-slate-950">Ask both the same security and data questions:</strong>
              </p>
              <ul className="list-disc space-y-2 pl-5 marker:text-teal-700">
                <li>
                  <strong className="font-semibold text-slate-950">Security.</strong> NIST’s small-business guidance recommends multifactor authentication, keeping software updated, and protected, tested backups (<ExternalLink href={nistBasicsUrl}>NIST</ExternalLink>). Who can see or change records? How do departing staff lose access? Who restores lost data?
                </li>
                <li>
                  <strong className="font-semibold text-slate-950">AI and client data.</strong> When AI touches your claims, which service processes client information, and is it kept or used for anything else?
                </li>
                <li>
                  <strong className="font-semibold text-slate-950">Exit.</strong> Can you get documents, notes, and their links to claims out in a usable form? Try an export before you depend on it.
                </li>
                <li>
                  <strong className="font-semibold text-slate-950">Key person.</strong> If the builder, administrator, or vendor contact becomes unavailable, who takes over?
                </li>
              </ul>

              <Heading>Test before you commit</Heading>
              <p>
                Run a made-up claim through your current setup: add a document, assign a follow-up, record a partial payment, and pull up the history. Have the person who uses the system daily do it, and note the effort. Then run the same claim through anything you’re considering, whether it’s a tune-up, your own build, or a provider’s trial. Keep tests away from live files and track critical dates separately while testing.
              </p>
              <p>If the test shows little benefit, keeping what you have is a good answer. Mixing paths is fine too.</p>
              <p>Choose for the work your office actually does and the responsibilities you’re willing to carry.</p>

              <p className="border-t border-slate-200 pt-6 text-sm italic leading-6 text-slate-600">
                Sponsor note: This article was written by the team behind PA ClaimBoard, a claims CRM for small public adjusting offices, which is an option-4 provider. We’ve tried to describe every path fairly, including the ones that don’t involve us. PA ClaimBoard is looking for founding offices to help shape the product. Learn more at{" "}
                <a
                  href={canonicalOrigin}
                  className="font-medium text-teal-800 underline decoration-teal-700/40 underline-offset-2 hover:text-teal-900"
                >
                  paclaimboard.com
                </a>.
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
