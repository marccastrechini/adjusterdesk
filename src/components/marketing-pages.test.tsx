import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import FoundingPublicAdjusterOfficesPage from "@/app/(public)/founding-public-adjuster-offices/page";
import HomePage from "@/app/(public)/page";
import KeepImproveOrChoosePage from "@/app/(public)/resources/keep-improve-or-choose-a-provider/page";
import ResourcesPage from "@/app/(public)/resources/page";
import TrainingPage from "@/app/(public)/training/page";
import { PublicSiteChrome } from "@/components/public-site";
import { brandName, brandNameTM } from "@/lib/brand";

test("home hero answers what, who, and the offer before the feature grid", () => {
  const html = renderToStaticMarkup(<HomePage />);
  const eyebrow = html.indexOf("For 1–5 person public adjusting offices");
  const title = html.indexOf("Public adjuster CRM and claims management software");
  const subhead = html.indexOf(
    "A straightforward office workspace for small public adjusting firms. Track claims, follow-ups, settlements, invoices, and unpaid fees—all in one place.",
  );
  const points = html.indexOf("Track settlement checks, PA fees, and the money still owed on every claim.");
  const offer = html.indexOf("$0 for 90 days, then $29/month Solo or $49/month Small Office");
  const featureGrid = html.indexOf("Fee and invoice tracking");

  assert.ok(eyebrow >= 0 && title > eyebrow);
  assert.ok(subhead > title);
  assert.ok(points > subhead && points < featureGrid);
  assert.ok(offer > subhead && offer < featureGrid);
  assert.ok(featureGrid > 0);
  assert.equal(html.indexOf("See the desk in 60 seconds"), -1);
  assert.equal(html.indexOf("Optional: watch a 60-second Demo Office walkthrough"), -1);
  assert.match(html, /See founding desk offer/);
  assert.match(html, /Today view/);
  assert.match(html, new RegExp(brandName));
  assert.ok(html.includes(`${brandNameTM} is a simple office workspace`));
  assert.doesNotMatch(html, /<video|product-overview\.mp4/i);
  assert.doesNotMatch(html, /autoplay/i);
  assert.match(html, /PA ClaimBoard takes no cut/);
  assert.match(html, /card or bank transfer \(ACH\)/);
  assert.doesNotMatch(html, /coming soon/i);
  assert.match(html, /Tell us, and we&#x27;ll work with you on connecting it/);
  assert.doesNotMatch(html, /Klarna|Affirm|buy now, pay later|surcharge-ready|works with any/i);
});

test("founding page states the product and the founders without the overview video", () => {
  const html = renderToStaticMarkup(<FoundingPublicAdjusterOfficesPage />);
  const title = html.indexOf("Claims, follow-ups, documents, and fees are slipping.");
  const product = html.indexOf("One workspace: leads, claims, documents, follow-ups, settlements, fees.");
  const byline = html.indexOf("Built by Marc (Product) and Jenn (Customers)");
  const pain = html.indexOf("Where the work slips");
  const value = html.indexOf("What you get on the desk");

  assert.ok(title >= 0 && product > title && product < pain);
  assert.ok(byline > title && byline < pain);
  assert.ok(value > pain);
  assert.equal(html.indexOf("See the desk in 60 seconds"), -1);
  assert.equal(html.indexOf("Optional: watch a 60-second Demo Office walkthrough"), -1);
  assert.match(html, /\$0 for 90 days, then \$29\/month Solo or \$49\/month Small Office/);
  assert.match(html, new RegExp(brandName));
  assert.doesNotMatch(html, /<video|product-overview\.mp4/i);
  assert.doesNotMatch(html, /autoplay/i);
  assert.doesNotMatch(html, /Castrechini|Castrochini/i);
});

test("resources page lists published pages and a free trial, without placeholder cards", () => {
  const html = renderToStaticMarkup(<ResourcesPage />);

  assert.match(html, /Public adjuster software resources/);
  assert.match(html, /href="\/claimwizard-alternative"/);
  assert.match(html, /Training walkthrough/);
  assert.match(html, /href="\/training"/);
  assert.match(html, /href="\/help"/);
  assert.match(html, /href="\/resources\/keep-improve-or-choose-a-provider"/);
  assert.match(html, /Read the article/);
  assert.match(html, /href="\/signup"/);
  assert.match(html, /Start free trial/);
  assert.match(html, /href="\/founding-public-adjuster-offices"/);
  assert.match(html, /href="\/free-public-adjuster-claim-tracker"/);
  assert.match(html, new RegExp(brandName));
  assert.equal(html.includes("Coming soon"), false);
  assert.doesNotMatch(html, /Importing from spreadsheets|as the site grows/);
});

test("training page keeps the three modules and points to signup", () => {
  const html = renderToStaticMarkup(<TrainingPage />);

  assert.match(html, /Public adjuster CRM training/);
  assert.match(html, /on your own time/);
  assert.match(html, /Desk overview/);
  assert.match(html, /Lead to claim/);
  assert.match(html, /Follow-ups that don/);
  assert.match(html, /href="\/signup"/);
  assert.match(html, /Start free trial/);
  assert.match(html, /href="\/help"/);
  assert.match(html, new RegExp(brandName));
  assert.equal(html.includes("Coming soon"), false);
  assert.doesNotMatch(html, /not written yet/);
});

test("public header points at the founding offer", () => {
  const html = renderToStaticMarkup(
    <PublicSiteChrome>
      <p>Page</p>
    </PublicSiteChrome>,
  );

  assert.match(html, /href="\/founding-public-adjuster-offices"/);
  assert.ok(html.includes(brandNameTM));
  assert.ok(html.includes(`${brandNameTM} is a trademark of its owner.`));
  assert.equal(html.includes("®"), false);
  assert.match(html, /Founding desk · \$0\/90 days/);
  assert.match(html, /href="\/signup"/);
  assert.match(html, /Start free trial/);
  assert.match(html, /href="\/claimwizard-alternative"/);
  assert.match(html, /href="\/resources\/keep-improve-or-choose-a-provider"/);
  assert.match(html, /Keep, improve, or choose/);
});

test("resource article stays a fair reading and does not pitch the product", () => {
  const html = renderToStaticMarkup(<KeepImproveOrChoosePage />);

  assert.match(html, /Keep It, Improve It, or Choose a Provider\? Three Sensible Paths for Your PA Office/);
  assert.match(html, /Marc Castrechini, founder of PA ClaimBoard/);
  assert.match(html, /<time dateTime="2026-11">November 2026<\/time>/);
  assert.match(html, /Written by the founder of PA ClaimBoard\. We tried to give each option a fair shake\./);
  assert.match(html, /If it ain’t broke, don’t fix it\./);
  assert.match(html, /What needs attention today\?/);
  assert.match(html, /Choose for the work your office actually does and the responsibilities you are willing to carry\./);
  assert.match(html, /href="https:\/\/docs\.github\.com\/en\/copilot\/tutorials\/review-ai-generated-code"/);
  assert.match(html, /href="https:\/\/www\.nist\.gov\/itl\/smallbusinesscyber\/cybersecurity-basics"/);
  assert.match(html, />GitHub Docs</);
  assert.match(html, />NIST</);
  assert.equal(html.match(/target="_blank"/g)?.length, 2);
  assert.equal(html.match(/rel="noopener noreferrer"/g)?.length, 2);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /Sponsor note: Marc Castrechini is the founder of PA ClaimBoard/);
  assert.match(html, /responds quickly to feedback\./);
  assert.match(html, /href="\/resources"/);
  assert.doesNotMatch(html, /Learn more at/);
  assert.doesNotMatch(html, /href="https:\/\/paclaimboard\.com/);
  assert.doesNotMatch(html, /SPONSORED CONTENT/);
  assert.doesNotMatch(html, /Pitch email|Article submission|May I submit/);
  assert.doesNotMatch(html, /utm_/i);
  assert.doesNotMatch(html, /adjusterdesk/i);
  assert.doesNotMatch(html, /href="\/signup"|href="\/pricing"|Start free trial|\$49/);
  assert.doesNotMatch(html, /street address|Street|Avenue|Boulevard/i);
});
