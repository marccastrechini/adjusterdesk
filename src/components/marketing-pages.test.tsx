import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import FoundingPublicAdjusterOfficesPage from "@/app/(public)/founding-public-adjuster-offices/page";
import HomePage from "@/app/(public)/page";
import { PublicSiteChrome } from "@/components/public-site";
import { brandName } from "@/lib/brand";

test("home hero answers what, who, and the offer before the feature grid", () => {
  const html = renderToStaticMarkup(<HomePage />);
  const eyebrow = html.indexOf("For 1–5 person public adjusting offices");
  const title = html.indexOf("The desk for small public adjusting offices");
  const subhead = html.indexOf(
    "Leads, claims, documents, follow-ups, settlements, and fees—on one desk instead of email, memory, and folders.",
  );
  const offer = html.indexOf("$0 for 90 days, then $29/month Solo or $49/month Small Office");
  const featureGrid = html.indexOf("Fee and invoice tracking");

  assert.ok(eyebrow >= 0 && title > eyebrow);
  assert.ok(subhead > title);
  assert.ok(offer > subhead && offer < featureGrid);
  assert.ok(featureGrid > 0);
  assert.equal(html.indexOf("See the desk in 60 seconds"), -1);
  assert.equal(html.indexOf("Optional: watch a 60-second Demo Office walkthrough"), -1);
  assert.match(html, /See founding desk offer/);
  assert.match(html, /Today view/);
  assert.match(html, new RegExp(brandName));
  assert.doesNotMatch(html, /<video|product-overview\.mp4/i);
  assert.doesNotMatch(html, /autoplay/i);
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

test("public header points at the founding offer", () => {
  const html = renderToStaticMarkup(
    <PublicSiteChrome>
      <p>Page</p>
    </PublicSiteChrome>,
  );

  assert.match(html, /href="\/founding-public-adjuster-offices"/);
  assert.match(html, /Founding desk · \$0\/90 days/);
  assert.match(html, /href="\/signup"/);
  assert.match(html, /Start free trial/);
});
