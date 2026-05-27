type SystemEmailTemplateInput = {
  preheader: string;
  title: string;
  intro: string;
  bodyLines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryText?: string;
  footer: string;
};

type RenderedSystemEmail = {
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderSystemEmailTemplate(input: SystemEmailTemplateInput): RenderedSystemEmail {
  const body = input.bodyLines.filter((line) => line.trim().length > 0);
  const textLines = [
    input.title,
    "",
    input.intro,
    "",
    ...body,
    "",
    input.ctaLabel && input.ctaUrl ? `${input.ctaLabel}: ${input.ctaUrl}` : "",
    input.secondaryText ?? "",
    "",
    input.footer,
  ].filter((line) => line.trim().length > 0);

  const paragraphHtml = body.map((line) => `<p style="margin: 0 0 12px; color: #475569; font-size: 15px; line-height: 1.65;">${escapeHtml(line)}</p>`).join("");
  const ctaHtml =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin: 20px 0 16px;"><a href="${escapeHtml(input.ctaUrl)}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 11px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;">${escapeHtml(input.ctaLabel)}</a></p>`
      : "";
  const secondaryHtml = input.secondaryText
    ? `<p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.55;">${escapeHtml(input.secondaryText)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f8fafc; color: #0f172a; font-family: Arial, Helvetica, sans-serif;">
    <span style="display: none; visibility: hidden; opacity: 0; overflow: hidden; height: 0; width: 0; color: transparent;">${escapeHtml(input.preheader)}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 620px;">
            <tr>
              <td style="padding: 0 8px 12px; color: #0f766e; font-size: 13px; font-weight: 700; letter-spacing: 0.2px;">AdjusterDesk</td>
            </tr>
            <tr>
              <td style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 24px;">
                <h1 style="margin: 0 0 12px; color: #0f172a; font-size: 24px; line-height: 1.3; font-weight: 700;">${escapeHtml(input.title)}</h1>
                <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.65;">${escapeHtml(input.intro)}</p>
                ${paragraphHtml}
                ${ctaHtml}
                ${secondaryHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 8px 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">${escapeHtml(input.footer)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    html,
    text: textLines.join("\n"),
  };
}