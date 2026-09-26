import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage from "@/app/(public)/about/page";
import ContactPage from "@/app/(public)/contact/page";
import CookiesPage from "@/app/(public)/cookies/page";
import PrivacyPage from "@/app/(public)/privacy/page";
import TermsPage from "@/app/(public)/terms/page";
import { PublicSiteChrome } from "@/components/public-site";
import { publicSitemapPaths } from "@/lib/public-sitemap";

const publishedPricing =
  "Public pricing is Solo $49/month, Small Office $99/month, and Team $199/month. Signup uses Stripe Checkout and collects a card. On that path, $0 is due during the 14-day trial, then the plan price. Founding Solo and Small Office Checkout charges $0 during a 90-day trial, then $29/month or $49/month, locked for 12 months for the first 10 offices.";

test("privacy and cookies disclose live Google Analytics 4 without a consent UI", () => {
  const privacy = renderToStaticMarkup(<PrivacyPage />);
  const cookies = renderToStaticMarkup(<CookiesPage />);

  for (const html of [privacy, cookies]) {
    assert.match(html, /Google Analytics 4/);
    assert.match(html, /G-QM2L44CMB2/);
    assert.match(html, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
    assert.match(html, /_ga/);
    assert.match(html, /_gid/);
    assert.match(html, /no cookie-consent/);
    assert.match(html, /Counsel may require/);
    assert.match(html, /not used for ads|not used for ads, remarketing|not used for ads or retargeting|no advertising or retargeting/i);
    assert.doesNotMatch(html, /does not currently include analytics/);
    assert.doesNotMatch(html, /no analytics tracking is active/);
    assert.doesNotMatch(html, /does not include advertising pixels, retargeting scripts, or public marketing analytics/);
  }

  assert.match(privacy, /Not attorney-reviewed/);
  assert.match(privacy, /hello@adjusterdesk\.xyz/);
  assert.doesNotMatch(privacy, /SOC 2 certified|HIPAA compliant|CCPA certified/i);
});

test("terms keep published prices and state trial, cancel, Stripe, and data ownership", () => {
  const html = renderToStaticMarkup(<TermsPage />);

  assert.match(html, /Not attorney-reviewed/);
  assert.match(html, new RegExp(publishedPricing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /Stripe is the payment processor/);
  assert.match(html, /unless the office cancels first/);
  assert.match(html, /hello@adjusterdesk\.xyz/);
  assert.match(html, /governing law for a customer agreement is not chosen yet \(TBD\)/i);
  assert.match(html, /not legal advice, estimating advice, coverage advice/);
  assert.match(html, /customer office owns the claim, client, document/i);
  assert.doesNotMatch(html, /Massachusetts/);
  assert.doesNotMatch(html, /SOC 2 certified|HIPAA compliant/i);
});

test("about and contact stay thin and do not invent a legal entity", () => {
  const about = renderToStaticMarkup(<AboutPage />);
  const contact = renderToStaticMarkup(<ContactPage />);

  assert.match(about, /Marc works on the product/);
  assert.match(about, /Jenn works with customers/);
  assert.match(about, /first names only/);
  assert.match(about, /legal entity name and mailing address are not published/);
  assert.match(about, /href="\/contact"/);
  assert.match(about, /href="\/demo"/);
  assert.match(about, /href="\/help"/);
  assert.doesNotMatch(about, /LLC|Inc\.|Castrechini|street address is/i);

  assert.match(contact, /hello@adjusterdesk\.xyz/);
  assert.match(contact, /within a few business days/);
  assert.match(contact, /href="\/demo"/);
  assert.match(contact, /href="\/help"/);
});

test("footer and sitemap link about and contact", () => {
  const html = renderToStaticMarkup(
    <PublicSiteChrome>
      <p>Page</p>
    </PublicSiteChrome>,
  );

  assert.match(html, /href="\/about"/);
  assert.match(html, /href="\/contact"/);

  assert.ok(publicSitemapPaths.includes("/about"));
  assert.ok(publicSitemapPaths.includes("/contact"));
});
