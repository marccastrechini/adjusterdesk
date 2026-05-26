import { expect, test, type Page } from "@playwright/test";

function uniqueSuffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function dateInput(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

async function createLead(page: Page, suffix: string) {
  const firstName = `Smoke${suffix.slice(-5)}`;
  const lastName = "Lead";
  const fullName = `${firstName} ${lastName}`;

  await page.goto("/leads/new");
  await expect(page.getByRole("heading", { name: "New lead" })).toBeVisible();
  await page.locator('input[name="firstName"]').fill(firstName);
  await page.locator('input[name="lastName"]').fill(lastName);
  await page.locator('input[name="email"]').fill(`smoke-${suffix}@example.com`);
  await page.locator('input[name="phone"]').fill("(813) 555-0400");
  await page.locator('input[name="address1"]').fill(`${suffix.slice(-4)} Cypress Smoke Lane`);
  await page.locator('input[name="city"]').fill("Tampa");
  await page.locator('input[name="postalCode"]').fill("33602");
  await page.locator('input[name="lossType"]').fill("Kitchen water damage");
  await page.locator('input[name="dateOfLoss"]').fill(dateInput(-4));
  await page.locator('input[name="followUpDate"]').fill(dateInput(2));
  await page.locator('input[name="source"]').fill("Smoke test");
  await page.locator('input[name="referralSource"]').fill("Automated browser smoke");
  await page.locator('textarea[name="notes"]').fill("Automated smoke test lead. Local dev data only.");
  await page.getByRole("button", { name: "Save lead and open detail" }).click();

  await expect(page).toHaveURL(/\/leads\/.+notice=lead-created/);
  await expect(page.getByText("Lead saved", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: fullName })).toBeVisible();

  return { firstName, fullName };
}

async function createDirectClaim(page: Page, suffix: string) {
  const firstName = `Direct${suffix.slice(-5)}`;
  const lastName = "Claim";

  await page.goto("/claims/new");
  await page.locator('input[name="firstName"]').fill(firstName);
  await page.locator('input[name="lastName"]').fill(lastName);
  await page.locator('input[name="address1"]').fill(`${suffix.slice(-4)} Validation Avenue`);
  await page.locator('input[name="city"]').fill("Clearwater");
  await page.locator('input[name="postalCode"]').fill("33756");
  await page.locator('input[name="carrierName"]').fill("Smoke Test Insurance");
  await page.locator('input[name="lossType"]').fill("Wind roof leak");
  await page.locator('input[name="dateOfLoss"]').fill(dateInput(-6));
  await page.locator('input[name="deadlineDate"]').fill(dateInput(14));
  await page.locator('input[name="nextStep"]').fill("Call carrier for desk adjuster assignment.");
  await page.getByRole("button", { name: "Save claim and open overview" }).click();

  await expect(page).toHaveURL(/\/claims\/.+notice=claim-created/);
  await expect(page.getByText("Claim saved", { exact: true })).toBeVisible();
  await expect(page.getByText("What to work next")).toBeVisible();
  return page.url().split("?")[0];
}

test("critical demo flow works from Today through Lead, Claim, Documents, and Money", async ({ page }) => {
  const suffix = uniqueSuffix();
  const taskTitle = `Call client about smoke test ${suffix}`;
  const claimTaskTitle = `Request mitigation invoice ${suffix}`;
  const documentTitle = `Mitigation invoice ${suffix}`;
  const invoiceNumber = `AD-SMOKE-${suffix.slice(-8).toUpperCase()}`;

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByText("Work the office in this order")).toBeVisible();

  await createLead(page, suffix);

  await page.locator('input[name="title"]').fill(taskTitle);
  await page.locator('input[name="dueDate"]').fill(dateInput(3));
  await page.getByRole("button", { name: "Add follow-up task" }).click();
  await expect(page.getByText("Task saved", { exact: true })).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await page.locator('input[name="subject"]').fill(`Smoke note ${suffix}`);
  await page.locator('textarea[name="body"]').fill("Client prefers a morning call and may have mitigation photos ready.");
  await page.getByRole("button", { name: "Log lead note" }).click();
  await expect(page.getByText("Note logged", { exact: true })).toBeVisible();
  await expect(page.getByText(`Smoke note ${suffix}`)).toBeVisible();

  await page.locator('input[name="carrierName"]').fill("Smoke Test Mutual");
  await page.locator('input[name="policyNumber"]').fill(`STM-HO-${suffix}`);
  await page.locator('input[name="claimNumber"]').fill(`STM-${suffix}`);
  await page.locator('textarea[name="nextStep"]').fill("Request policy declarations and schedule inspection.");
  await page.getByRole("button", { name: "Convert to claim and open overview" }).click();
  await expect(page).toHaveURL(/\/claims\/.+notice=lead-converted/);
  await expect(page.getByText("Lead converted", { exact: true })).toBeVisible();
  await expect(page.getByText("What to work next")).toBeVisible();
  const claimUrl = page.url().split("?")[0];

  await page.goto(`${claimUrl}/client-status`);
  await expect(page.getByText("No client status link yet", { exact: true })).toBeVisible();
  await expect(page.getByText("Create a link when the office is ready to share this simple claim update with the client.")).toBeVisible();
  await expect(page.getByText("Send a document to the office")).toHaveCount(0);

  await page.getByRole("link", { name: "Tasks", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.locator('input[name="title"]').first().fill(claimTaskTitle);
  await page.locator('input[name="dueDate"]').first().fill(dateInput(4));
  await page.locator('textarea[name="notes"]').first().fill("Ask for dry-out invoice and moisture readings.");
  await page.getByRole("button", { name: "Add task to claim" }).click();
  await expect(page.getByText("Task saved", { exact: true })).toBeVisible();
  await expect(page.getByText(claimTaskTitle)).toBeVisible();

  await page.goto(`${claimUrl}/documents`);
  await page.locator('input[name="title"]').fill(documentTitle);
  await page.locator('textarea[name="notes"]').fill("Client needs to send the dry-out invoice and final moisture readings.");
  await page.locator('input[name="requestedFromClient"]').check();
  await page.getByRole("button", { name: "Save document or request" }).click();
  await expect(page.getByText("Client document requested", { exact: true })).toBeVisible();
  await expect(page.getByText(documentTitle)).toBeVisible();
  await expect(page.getByText("1 requested", { exact: true })).toBeVisible();
  await expect(page.getByText("Waiting on client", { exact: true })).toBeVisible();

  await page.goto(`${claimUrl}/documents?q=${encodeURIComponent(documentTitle)}&status=REQUESTED`);
  await expect(page.getByText(documentTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("1 requested", { exact: true })).toBeVisible();

  await page.goto(`${claimUrl}/money`);
  await page.locator('input[name="demandAmount"]').fill("28500");
  await page.locator('input[name="offerAmount"]').fill("21000");
  await page.locator('input[name="acceptedAmount"]').fill("24000");
  await page.locator('select[name="status"]').first().selectOption("ACCEPTED");
  await page.locator('input[name="offeredAt"]').fill(dateInput(5));
  await page.locator('textarea[name="notes"]').first().fill("Accepted after revised cabinet allowance.");
  await page.getByRole("button", { name: "Save settlement round" }).click();
  await expect(page.getByText("Settlement round saved", { exact: true })).toBeVisible();
  await expect(page.getByText("$24,000").first()).toBeVisible();

  await page.locator('input[name="invoiceNumber"]').fill(invoiceNumber);
  await page.locator('input[name="settlementAmount"]').fill("24000");
  await page.locator('input[name="feePercent"]').fill("10");
  await page.locator('select[name="status"]').last().selectOption("SENT");
  await page.locator('input[name="issuedAt"]').fill(dateInput(6));
  await page.locator('input[name="dueAt"]').fill(dateInput(13));
  await page.locator('textarea[name="notes"]').last().fill("10% fee on accepted settlement.");
  await page.getByRole("button", { name: "Create fee invoice" }).click();
  await expect(page.getByText("Invoice saved", { exact: true })).toBeVisible();
  await expect(page.getByText(invoiceNumber).first()).toBeVisible();

  await page.locator('select[name="invoiceId"]').selectOption({ label: invoiceNumber });
  await page.locator('input[name="amount"]').fill("1200");
  await page.locator('input[name="paidAt"]').fill(dateInput(7));
  await page.locator('input[name="checkNumber"]').fill(`CHK-${suffix.slice(-6)}`);
  await page.locator('input[name="payee"]').fill("Harbor Public Adjusting");
  await page.locator('textarea[name="notes"]').nth(1).fill("Partial smoke test fee payment.");
  await page.getByRole("button", { name: "Record check or payment" }).click();
  await expect(page.getByText("Payment recorded", { exact: true })).toBeVisible();
  await expect(page.getByText(`Fee payment for ${invoiceNumber}`).first()).toBeVisible();

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
});

test("friendly validation appears for missing lead, claim, invoice, and payment basics", async ({ page }) => {
  const suffix = uniqueSuffix();

  await page.goto("/leads/new");
  await page.getByRole("button", { name: "Save lead and open detail" }).click();
  await expect(page).toHaveURL(/\/leads\/new$/);
  await expect(page.getByText("Add the client name, property basics, loss type, and lead source before saving this lead.")).toBeVisible();
  await expect(page.getByText("Add the client's first name.")).toBeVisible();
  await expect(page.getByText("Add a short loss type like water damage or roof leak.")).toBeVisible();

  await page.goto("/claims/new");
  await page.getByRole("button", { name: "Save claim and open overview" }).click();
  await expect(page).toHaveURL(/\/claims\/new$/);
  await expect(page.getByText("Add the client name, damaged property address, and loss type before saving this claim.")).toBeVisible();
  await expect(page.getByText("Add the damaged property address.")).toBeVisible();

  const claimUrl = await createDirectClaim(page, suffix);
  await page.goto(`${claimUrl}/money`);

  await page.getByRole("button", { name: "Create fee invoice" }).click();
  await expect(page).toHaveURL(/\/money$/);
  await expect(page.getByText("Add an invoice number, settlement amount, and fee percent before creating this invoice.")).toBeVisible();
  await expect(page.getByText("Add the office invoice number.")).toBeVisible();
  await expect(page.getByText("Add a settlement amount greater than $0.")).toBeVisible();

  await page.goto(`${claimUrl}/money`);
  await page.locator('input[name="invoiceNumber"]').fill(`BAD-${suffix.slice(-6)}`);
  await page.locator('input[name="settlementAmount"]').fill("1000");
  await page.locator('input[name="feePercent"]').fill("0");
  await page.getByRole("button", { name: "Create fee invoice" }).click();
  await expect(page.getByText("Add a fee percent greater than 0.")).toBeVisible();

  await page.goto(`${claimUrl}/money`);
  await page.getByRole("button", { name: "Record check or payment" }).click();
  await expect(page.getByText("Add the payment amount and payee before recording this check or payment.")).toBeVisible();
  await expect(page.getByText("Add a payment amount greater than $0.")).toBeVisible();
  await expect(page.getByText("Add who the check or payment was made out to.")).toBeVisible();
});