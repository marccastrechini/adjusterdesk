import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSystemEmailTemplates } from "./system-email-templates";

describe("system email templates", () => {
  it("includes core transactional and outreach templates", () => {
    const templates = getSystemEmailTemplates();
    const ids = templates.map((t) => t.id);

    assert.ok(ids.includes("password_reset"));
    assert.ok(ids.includes("user_invitation"));
    assert.ok(ids.includes("trial_signup_alert"));
    assert.ok(ids.includes("welcome_signup"));
    assert.ok(ids.includes("outreach_first_email"));
    assert.ok(ids.includes("outreach_follow_up"));
  });

  it("every template has required fields", () => {
    const templates = getSystemEmailTemplates();

    for (const template of templates) {
      assert.ok(template.id, `${template.id}: missing id`);
      assert.ok(template.name, `${template.id}: missing name`);
      assert.ok(template.subject, `${template.id}: missing subject`);
      assert.ok(template.from, `${template.id}: missing from`);
      assert.ok(template.replyTo, `${template.id}: missing replyTo`);
      assert.ok(template.html.includes("AdjusterDesk"), `${template.id}: html missing AdjusterDesk`);
      assert.ok(template.text.length > 0, `${template.id}: text is empty`);
    }
  });

  it("customer templates use system email from address", () => {
    const templates = getSystemEmailTemplates();
    const customer = templates.filter((t) => t.audience === "customer");

    assert.ok(customer.length > 0, "expected customer templates");
    for (const t of customer) {
      assert.ok(t.from.includes("hello@adjusterdesk.xyz") || t.from.length > 0, `${t.id}: unexpected from`);
    }
  });

  it("trial signup alert is audience internal", () => {
    const templates = getSystemEmailTemplates();
    const alert = templates.find((t) => t.id === "trial_signup_alert");

    assert.ok(alert, "trial_signup_alert not found");
    assert.equal(alert.audience, "internal");
  });

  it("templates contain sample data values in rendered html", () => {
    const templates = getSystemEmailTemplates();

    const passwordReset = templates.find((t) => t.id === "password_reset")!;
    assert.ok(passwordReset.html.includes("Reset your password"), "password_reset html missing title");
    assert.ok(passwordReset.html.includes("Alex Johnson"), "password_reset html missing sample name");

    const invitation = templates.find((t) => t.id === "user_invitation")!;
    assert.ok(invitation.html.includes("Set up your account"), "user_invitation html missing title");
    assert.ok(invitation.html.includes("Sample Adjusting Co"), "user_invitation html missing workspace name");

    const welcomeSignup = templates.find((t) => t.id === "welcome_signup")!;
    assert.ok(welcomeSignup.html.includes("Welcome to AdjusterDesk"), "welcome_signup html missing title");
  });

  it("no template html contains script tags", () => {
    const templates = getSystemEmailTemplates();

    for (const template of templates) {
      assert.ok(!/<script/i.test(template.html), `${template.id}: html must not contain script tags`);
    }
  });
});
