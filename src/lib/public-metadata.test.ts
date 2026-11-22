import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { metadata as about } from "@/app/(public)/about/page";
import { metadata as accessibility } from "@/app/(public)/accessibility/page";
import { metadata as claimwizard } from "@/app/(public)/claimwizard-alternative/page";
import { metadata as contact } from "@/app/(public)/contact/page";
import { metadata as cookies } from "@/app/(public)/cookies/page";
import { metadata as demo } from "@/app/(public)/demo/page";
import { metadata as features } from "@/app/(public)/features/page";
import { metadata as founding } from "@/app/(public)/founding-public-adjuster-offices/page";
import { metadata as tracker } from "@/app/(public)/free-public-adjuster-claim-tracker/page";
import { metadata as help } from "@/app/(public)/help/page";
import { metadata as howItWorks } from "@/app/(public)/how-it-works/page";
import { metadata as home } from "@/app/(public)/page";
import { metadata as pricing } from "@/app/(public)/pricing/page";
import { metadata as privacy } from "@/app/(public)/privacy/page";
import { metadata as product } from "@/app/(public)/product/page";
import { metadata as software } from "@/app/(public)/public-adjuster-software/page";
import { metadata as resources } from "@/app/(public)/resources/page";
import { metadata as security } from "@/app/(public)/security/page";
import { metadata as signup } from "@/app/(public)/signup/page";
import { metadata as signupCancel } from "@/app/(public)/signup/cancel/page";
import { metadata as signupSuccess } from "@/app/(public)/signup/success/page";
import { metadata as terms } from "@/app/(public)/terms/page";
import { metadata as training } from "@/app/(public)/training/page";
import { generateMetadata as trainingModuleMetadata } from "@/app/(public)/training/[slug]/page";
import { metadata as acceptInvite } from "@/app/accept-invite/page";
import { metadata as earlyAccess } from "@/app/early-access/page";
import { metadata as forgotPassword } from "@/app/forgot-password/page";
import { metadata as login } from "@/app/login/page";
import { metadata as resetPassword } from "@/app/reset-password/page";
import { metadata as claimStatus } from "@/app/status/[token]/page";
import { NOINDEX_ROBOTS } from "@/lib/site-host";

function titleOf(metadata: { title?: unknown }) {
  return metadata.title;
}

test("public titles target the search phrases", () => {
  assert.equal(titleOf(home), "Public Adjuster CRM & Claims Management Software | PA ClaimBoard");
  assert.equal(titleOf(software), "Public Adjuster Software | PA ClaimBoard");
  assert.equal(titleOf(product), "Public Adjuster Claims Management Software | PA ClaimBoard");
  assert.equal(titleOf(features), "Claim Tracker for Public Adjusters | PA ClaimBoard");
  assert.equal(titleOf(pricing), "Public Adjuster Software Pricing | PA ClaimBoard");
  assert.equal(titleOf(help), "Public Adjuster CRM Help and FAQ | PA ClaimBoard");
  assert.equal(titleOf(howItWorks), "How Public Adjuster Claims Management Works | PA ClaimBoard");
  assert.equal(titleOf(signup), "Start a Public Adjuster Software Trial | PA ClaimBoard");
  assert.equal(titleOf(resources), "Public Adjuster Software Resources | PA ClaimBoard");
  assert.equal(titleOf(training), "Public Adjuster CRM Training | PA ClaimBoard");
  assert.equal(titleOf(demo), "Public Adjuster Software Walkthrough | PA ClaimBoard");
  assert.equal(titleOf(about), "About PA ClaimBoard | Public Adjuster CRM");
  assert.equal(titleOf(contact), "Contact PA ClaimBoard | Public Adjuster Software");
  assert.equal(titleOf(founding), "Founding Public Adjuster Office Pricing | PA ClaimBoard");
  assert.equal(titleOf(tracker), "Free Public Adjuster Claim Tracker | PA ClaimBoard");
  assert.equal(titleOf(claimwizard), "ClaimWizard Alternative for Public Adjusters | PA ClaimBoard");
  assert.equal(titleOf(privacy), "Privacy Policy | PA ClaimBoard");
  assert.equal(titleOf(terms), "Terms of Use | PA ClaimBoard");
  assert.equal(titleOf(cookies), "Cookie Policy | PA ClaimBoard");
  assert.equal(titleOf(accessibility), "Accessibility Statement | PA ClaimBoard");
  assert.equal(titleOf(security), "Security Practices | PA ClaimBoard");

  for (const metadata of [home, product, features, pricing, help, software]) {
    const social = metadata as { openGraph?: { images?: unknown }; twitter?: { card?: string; images?: unknown } };
    assert.equal(social.twitter?.card, "summary_large_image");
    assert.ok(social.openGraph?.images);
    assert.ok(social.twitter?.images);
  }
});

test("training module titles name the lesson and the product", async () => {
  const metadata = await trainingModuleMetadata({ params: Promise.resolve({ slug: "desk-overview" }) });
  assert.equal(metadata.title, "Desk overview: Public Adjuster CRM Training | PA ClaimBoard");
});

test("app and auth metadata request noindex,nofollow", () => {
  for (const metadata of [login, forgotPassword, resetPassword, acceptInvite, earlyAccess, claimStatus, signupSuccess, signupCancel]) {
    assert.equal(metadata.robots, NOINDEX_ROBOTS);
  }

  const appLayout = readFileSync(new URL("../app/(app)/layout.tsx", import.meta.url), "utf8");
  assert.match(appLayout, /robots: NOINDEX_ROBOTS/);
});
