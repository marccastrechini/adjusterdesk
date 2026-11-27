import { listPublicPlans, monthlyPriceDollars } from "@/lib/billing";
import { brandName, canonicalOrigin } from "@/lib/brand";
import type { HelpFaq } from "@/lib/help-faqs";

const pricingUrl = `${canonicalOrigin}/pricing`;

function offer(name: string, price: string, description: string) {
  return {
    "@type": "Offer",
    name,
    price,
    priceCurrency: "USD",
    url: pricingUrl,
    availability: "https://schema.org/InStock",
    description,
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandName,
    url: canonicalOrigin,
    logo: `${canonicalOrigin}/logo.png`,
  };
}

/**
 * Offers match the prices printed on /pricing:
 * Solo $49, Small Office $99, Team $199, founding Solo $29, founding Small Office $49.
 */
export function softwareApplicationJsonLd() {
  const standardOffers = listPublicPlans().map((plan) => {
    const dollars = monthlyPriceDollars(plan.slug, false);
    return offer(
      plan.label,
      `${dollars}.00`,
      `${plan.label} is ${plan.priceLabel} for up to ${plan.includedUserLimit} active ${plan.includedUserLimit === 1 ? "user" : "users"}. Stripe Checkout collects a card. $0 is due during the 14-day trial, then this price.`,
    );
  });

  const foundingSolo = monthlyPriceDollars("solo", true);
  const foundingSmallOffice = monthlyPriceDollars("small-office", true);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brandName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: canonicalOrigin,
    offers: [
      ...standardOffers,
      offer(
        "Founding Solo",
        `${foundingSolo}.00`,
        "First 10 offices. $0 for 90 days, then $29/month for 12 months, then the standard Solo price of $49/month. Stripe Checkout collects a card.",
      ),
      offer(
        "Founding Small Office",
        `${foundingSmallOffice}.00`,
        "First 10 offices. $0 for 90 days, then $49/month for 12 months, then the standard Small Office price of $99/month. Stripe Checkout collects a card.",
      ),
    ],
  };
}

export function faqPageJsonLd(faqs: HelpFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  authorName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    author: {
      "@type": "Person",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: brandName,
      url: canonicalOrigin,
      logo: {
        "@type": "ImageObject",
        url: `${canonicalOrigin}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url,
    },
    url: input.url,
  };
}

export function softwareOfferPrice(name: string): string | null {
  const match = softwareApplicationJsonLd().offers.find((entry) => entry.name === name);
  return match?.price ?? null;
}
