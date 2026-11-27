import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import HelpPage from "@/app/(public)/help/page";
import HomePage from "@/app/(public)/page";
import PricingPage from "@/app/(public)/pricing/page";
import { monthlyPriceDollars } from "@/lib/billing";
import { FOUNDING_PRICE_LINE } from "@/lib/founding-offer";
import { helpFaqs } from "@/lib/help-faqs";
import { articleJsonLd, faqPageJsonLd, organizationJsonLd, softwareApplicationJsonLd } from "@/lib/structured-data";

function pngSize(path: string) {
  const bytes = readFileSync(new URL(path, import.meta.url));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("organization and software offers use the published brand and prices", () => {
  const organization = organizationJsonLd();
  assert.equal(organization["@type"], "Organization");
  assert.equal(organization.name, "PA ClaimBoard");
  assert.equal(organization.url, "https://paclaimboard.com");
  assert.equal(organization.logo, "https://paclaimboard.com/logo.png");

  const software = softwareApplicationJsonLd();
  assert.equal(software.applicationCategory, "BusinessApplication");
  assert.deepEqual(
    software.offers.map((offer) => [offer.name, offer.price, offer.priceCurrency]),
    [
      ["Solo", "49.00", "USD"],
      ["Small Office", "99.00", "USD"],
      ["Team", "199.00", "USD"],
      ["Founding Solo", "29.00", "USD"],
      ["Founding Small Office", "49.00", "USD"],
    ],
  );
  assert.equal(monthlyPriceDollars("solo", false), 49);
  assert.equal(monthlyPriceDollars("small-office", true), 49);
  assert.equal(monthlyPriceDollars("solo", true), 29);
  assert.match(FOUNDING_PRICE_LINE, /\$29\/month Solo/);
  assert.match(FOUNDING_PRICE_LINE, /\$49\/month Small Office/);
  assert.doesNotMatch(JSON.stringify(software), /aggregateRating|reviewCount|customerCount/i);
});

test("help FAQ structured data is the same copy as the page", () => {
  const faq = faqPageJsonLd(helpFaqs);
  assert.equal(faq["@type"], "FAQPage");
  assert.equal(faq.mainEntity.length, helpFaqs.length);
  assert.equal(faq.mainEntity[0]?.name, helpFaqs[0]?.question);
  assert.equal(faq.mainEntity[0]?.acceptedAnswer.text, helpFaqs[0]?.answer);

  const html = renderToStaticMarkup(<HelpPage />);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /Public adjuster CRM help and FAQ/);
  assert.match(html, /card or bank transfer \(ACH\)/);
  for (const item of helpFaqs) {
    assert.ok(html.includes(item.question));
  }
});

test("article structured data names the piece without an address", () => {
  const article = articleJsonLd({
    headline: "AI and Your Claims Software: Four Honest Options for Small PA Offices",
    description: "Four honest options for small PA offices: keep your claims system, use AI to tune it, build your own, or use a provider.",
    url: "https://paclaimboard.com/resources/ai-and-your-claims-software",
    datePublished: "2026-11",
    dateModified: "2026-11-27",
    authorName: "PA ClaimBoard",
  });

  assert.equal(article["@type"], "Article");
  assert.equal(article.author["@type"], "Organization");
  assert.equal(article.author.name, "PA ClaimBoard");
  assert.equal(article.datePublished, "2026-11");
  assert.equal(article.dateModified, "2026-11-27");
  assert.equal(article.publisher.name, "PA ClaimBoard");
  assert.equal(article.publisher.logo.url, "https://paclaimboard.com/logo.png");
  assert.equal(article.url, "https://paclaimboard.com/resources/ai-and-your-claims-software");
  assert.equal(article.mainEntityOfPage["@id"], article.url);
  assert.equal("address" in article.publisher, false);
  assert.doesNotMatch(JSON.stringify(article), /adjusterdesk|streetAddress|Marc|Castrechini/i);
});

test("home and pricing render the software application offers", () => {
  for (const html of [renderToStaticMarkup(<HomePage />), renderToStaticMarkup(<PricingPage />)]) {
    assert.match(html, /"@type":"SoftwareApplication"/);
    assert.match(html, /BusinessApplication/);
    assert.match(html, /"price":"49.00"/);
    assert.match(html, /"price":"199.00"/);
    assert.match(html, /"price":"29.00"/);
  }
});

test("brand images are the social and logo sizes", () => {
  assert.deepEqual(pngSize("../../public/logo.png"), { width: 512, height: 512 });
  assert.deepEqual(pngSize("../../public/og.png"), { width: 1200, height: 630 });
});
