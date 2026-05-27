import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderSystemEmailTemplate } from "./email-template";

describe("system email template", () => {
  it("renders html and plain text output", () => {
    const result = renderSystemEmailTemplate({
      preheader: "Preheader text",
      title: "Reset your password",
      intro: "Hello Test User,",
      bodyLines: ["Line one.", "Line two."],
      ctaLabel: "Reset password",
      ctaUrl: "http://localhost:3000/reset-password?token=test",
      secondaryText: "If this was not you, ignore this email.",
      footer: "AdjusterDesk system email",
    });

    assert.ok(result.html.includes("AdjusterDesk"));
    assert.ok(result.html.includes("Reset password"));
    assert.ok(result.html.includes("href=\"http://localhost:3000/reset-password?token=test\""));
    assert.ok(result.text.includes("Reset password: http://localhost:3000/reset-password?token=test"));
    assert.ok(result.text.includes("If this was not you, ignore this email."));
  });
});