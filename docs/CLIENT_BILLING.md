# Client Billing

PA ClaimBoard has two different billing flows:

- SaaS billing: the office pays PA ClaimBoard for its subscription.
- Client billing: a public adjusting firm bills its own claim clients/customers through PA ClaimBoard.

Keep these separate in the code, UI, and tests.

## Stripe Connect Model

The first client-billing provider is Stripe Connect using direct charges.

- Each firm connects its own Stripe account.
- The firm is the merchant billing the client.
- PA ClaimBoard enables the workflow and stores sync state, but it does not collect the client invoice funds.
- There is no PA ClaimBoard platform fee in this implementation.
- Hosted invoices come from Stripe's hosted invoice page for the MVP.
- Manual invoice and payment entry stays available.

New connected accounts are created with the Accounts v2 API (`POST /v2/core/accounts`), not `POST /v1/accounts` with `type: express`.

- Dashboard: `full`. An Express dashboard cannot be combined with the fee collector below.
- Merchant configuration with `card_payments` requested. Invoices are still created on the connected account.
- `defaults.responsibilities.fees_collector`: `stripe`. The connected account pays card processing fees, matching legacy Express `application_express` pricing and the optional fee-recovery line item. The platform does not add an application fee.
- `defaults.responsibilities.losses_collector`: `stripe`. Stripe covers negative balances on these new accounts. Pairing platform loss liability with connected-account fee collection is not a supported v2 combination.
- Hosted onboarding uses v2 account links for the merchant configuration.
- Accounts created earlier with Accounts v1 Express stay on v1 account links and v1 account retrieve. Do not recreate them.
- The name on a hosted client invoice is the connected account's customer-facing business name, snapshotted onto the invoice as `account_name` when the invoice is created. That field is `defaults.profile.doing_business_as` on v2 and `business_profile.name` on v1. `display_name` alone is the Dashboard name and the name on invoices sent to the account, so new accounts set both to the firm name. The platform does not write `configuration.merchant.statement_descriptor` on these accounts: they use the full Stripe Dashboard, `fees_collector: stripe`, and an Account Link, and Stripe rejects that write. The office sets the card statement descriptor in its own Dashboard. An invoice that was already finalized keeps the name it was created with.
- The hosted invoice number is the app invoice number when it is 26 characters or shorter. It is sent when the draft is created. A later update of that same draft omits `number` when it already matches, because Stripe treats a repeat of the current number as a duplicate. The hosted page and PDF also include a description plus custom fields for Invoice #, Claim #, and the insured. A failed send stores the Stripe draft id immediately. The next attempt resumes that draft instead of creating another invoice.
- Paid client invoices store the PaymentIntent id from `invoice.payments` or `invoicePayments.list`. Current invoice objects no longer include `payment_intent`.

## Provider Abstraction

The client-billing layer is provider-neutral so other systems can be added later.

Supported providers now:

- `manual`
- `stripe_connect`
- `quickbooks`

Stripe is the default choice on Client Payments. A firm stays on its current provider until someone saves a different one. QuickBooks is hidden until the Intuit app credentials below are set.

Future providers should fit the same flow where possible:

- Square
- PayPal
- Other external billing systems

Provider-neutral fields are preferred over Stripe-only concepts when storing invoice, payment, and customer sync data.

## Firm Settings

Client billing settings live on Settings -> Client Payments.

The firm stores:

- current provider
- connection status
- whether client billing is enabled
- Stripe Connect account and readiness flags
- optional fee recovery settings

Fee recovery is off by default.

If fee recovery is enabled:

- the firm must explicitly acknowledge responsibility first
- the UI must warn that surcharging or convenience-fee rules may apply
- the recovery amount should be a separate invoice line item
- the feature should be easy to turn back off

## Manual Fallback

Manual invoice creation and manual payment recording still work without Stripe.

Use manual entry when:

- the firm has not connected Stripe yet
- the firm chooses not to use hosted payment requests
- a payment arrives outside the hosted invoice flow

## Test Mode Checklist

Use Stripe test mode before production.

1. Set the Stripe test secret key and Connect test webhook secret.
2. Connect a test Stripe account from Settings -> Client Payments.
3. Confirm the account reaches active/readable status before enabling client billing.
4. Confirm the Stripe Connect webhook endpoint is configured separately from SaaS billing at `/api/stripe/connect-webhook`.
5. Confirm the Accounts v2 thin-event endpoint is configured at `/api/stripe/connect-v2-webhook` with `STRIPE_CONNECT_V2_WEBHOOK_SECRET`. Its events come from the platform account, not from connected accounts.
6. Create a claim invoice and send a hosted payment request.
7. Confirm the invoice link and PDF are stored on the internal invoice record.
8. Pay the hosted invoice in Stripe test mode and confirm the internal invoice becomes paid.
9. Verify the payment row is created or updated from the Stripe Connect webhook.
10. Verify manual payment entry still works for the same claim.
11. If fee recovery is enabled, confirm it appears as a separate hosted invoice line item.
12. Confirm webhook retries do not duplicate the internal paid invoice state.

## Production Setup

Before production use:

1. Run `npm run db:generate`.
2. Apply the schema with `npm run prod:schema:apply -- -ConfirmProductionSchema` for the local production profile, or use the deployment checklist's guarded `prisma db push` path for the real production database.
3. Set `STRIPE_WEBHOOK_SECRET` for SaaS subscription billing.
4. Set `STRIPE_CONNECT_WEBHOOK_SECRET` for the separate Stripe Connect client-billing endpoint.
5. Set `STRIPE_CONNECT_V2_WEBHOOK_SECRET` for `/api/stripe/connect-v2-webhook`.
6. Configure the Connect webhook endpoint at `/api/stripe/connect-webhook`.
7. Configure the Accounts v2 thin-event endpoint at `/api/stripe/connect-v2-webhook` for events from your account.
8. Keep client billing disabled until the connected account is fully ready.
9. Re-run the sandbox checklist against Stripe test mode before switching the firm to live keys.

## Environment Matrix

- `.env.development.local` = local dev.
- `.env.production.local` = local production / public `paclaimboard.com` runner.
- `.env.qa.local` = QA runner if used.
- `*.example` = templates only, no secrets.

## QuickBooks Online

QuickBooks is a second client-invoice provider. The firm connects its own QuickBooks Online company. PA ClaimBoard creates the customer and the fee invoice, then asks QuickBooks to email it. QuickBooks Payments collects the card or ACH payment on Intuit's side. PA ClaimBoard does not take the funds and does not call the QuickBooks Payments charge API.

The feature stays off when `INTUIT_CLIENT_ID` or `INTUIT_CLIENT_SECRET` is empty. `INTUIT_ENVIRONMENT` defaults to `sandbox`. Only `production` selects the production API host.

### Intuit app

Create an app at [developer.intuit.com](https://developer.intuit.com). Use the Accounting scope. Do not request the Payments scope (`com.intuit.quickbooks.payment`). Invoice, customer, and payment records are Accounting API entities. Online card and ACH stay inside QuickBooks Payments when the emailed invoice includes a pay link.

Register these redirect URIs on the app. Intuit matches them exactly, including `https` and the path. Add the localhost URI only for a local sandbox test.

- `https://sandbox.paclaimboard.com/api/integrations/quickbooks/callback`
- `https://paclaimboard.com/api/integrations/quickbooks/callback`
- `http://localhost:3000/api/integrations/quickbooks/callback`

Set the webhook URL separately for the sandbox app and the production app. Subscribe to Invoice and Payment create, update, void, and delete events. Emailed is useful too. Copy that environment's verifier token into `INTUIT_WEBHOOK_VERIFIER_TOKEN`.

- Sandbox webhook: `https://sandbox.paclaimboard.com/api/integrations/quickbooks/webhook`
- Production webhook: `https://paclaimboard.com/api/integrations/quickbooks/webhook`

The endpoint checks the `intuit-signature` header, an HMAC-SHA256 of the raw body keyed with the verifier token. It accepts both the legacy `eventNotifications` body and the CloudEvents array. Intuit's notification does not include the invoice balance, so the handler reads the Invoice or Payment from the Accounting API. Refresh payment status on the claim, or Refresh status on Client Payments, polls open QuickBooks invoices when a webhook is missed.

### Environment

```bash
INTUIT_CLIENT_ID=
INTUIT_CLIENT_SECRET=
INTUIT_REDIRECT_URI=https://sandbox.paclaimboard.com/api/integrations/quickbooks/callback
INTUIT_ENVIRONMENT=sandbox
INTUIT_WEBHOOK_VERIFIER_TOKEN=
# Optional. Encrypts stored tokens. When unset, the client secret is the encryption key.
# Changing this value, or the client secret while this is unset, means each firm must reconnect.
INTUIT_TOKEN_ENCRYPTION_KEY=
```

`INTUIT_REDIRECT_URI` must be the callback for the host that starts the connection. Tokens are stored per firm with AES-256-GCM. Disconnect revokes the refresh token and deletes the stored tokens.

Accounting requests use minor version 75. Sandbox calls go to `https://sandbox-quickbooks.api.intuit.com`. Production calls go to `https://quickbooks.api.intuit.com`.

### Sandbox end-to-end test

1. Set the variables above for the sandbox keys. Leave `INTUIT_ENVIRONMENT` unset or set it to `sandbox`.
2. Apply the schema (`npm run db:generate`, then the usual schema apply) so the firm can store the QuickBooks connection.
3. Restart the app. Open `/settings/client-payments`, choose QuickBooks Online, and connect a sandbox company.
4. In that sandbox company, turn on QuickBooks Payments. Without it, QuickBooks can still email an invoice, but the pay-online link and card/ACH buttons stay empty until Payments is enabled. Refresh payment status after it is enabled to store the link.
5. Open a claim whose client contact has an email address. Create a fee invoice and send the payment request.
6. Confirm the QuickBooks invoice id and pay link are stored on the invoice. The sandbox company should show the customer and the emailed invoice.
7. Record a payment in the sandbox company, or pay the link with a sandbox payment method.
8. Confirm the claim invoice becomes paid and a QuickBooks payment row is stored. If the webhook does not arrive, use Refresh payment status on the claim.
9. Disconnect from Client Payments and confirm the office can connect again.

A QuickBooks invoice needs an income account in the company. The first send finds or creates a service item named `Public adjusting fee` on that account. The client contact needs an email address because QuickBooks emails the invoice. Fee recovery, when the office has turned it on and acknowledged it, is a second line on the QuickBooks invoice.

## Notes

- Keep SaaS subscription billing unchanged.
- Do not expose Stripe secrets in the UI or docs.
- Keep the client-billing layer conservative and easy to disable.
