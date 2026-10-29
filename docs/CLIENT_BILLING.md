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

Future providers should fit the same flow where possible:

- QuickBooks
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

## Notes

- Keep SaaS subscription billing unchanged.
- Do not expose Stripe secrets in the UI or docs.
- Keep the client-billing layer conservative and easy to disable.
