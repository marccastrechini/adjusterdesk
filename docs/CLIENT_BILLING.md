# Client Billing

AdjusterDesk has two different billing flows:

- SaaS billing: the office pays AdjusterDesk for its subscription.
- Client billing: a public adjusting firm bills its own claim clients/customers through AdjusterDesk.

Keep these separate in the code, UI, and tests.

## Stripe Connect Model

The first client-billing provider is Stripe Connect using direct charges.

- Each firm connects its own Stripe account.
- The firm is the merchant billing the client.
- AdjusterDesk enables the workflow and stores sync state, but it does not collect the client invoice funds.
- There is no AdjusterDesk platform fee in this implementation.
- Hosted invoices come from Stripe's hosted invoice page for the MVP.
- Manual invoice and payment entry stays available.

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
4. Create a claim invoice and send a hosted payment request.
5. Confirm the invoice link and PDF are stored on the internal invoice record.
6. Pay the hosted invoice in Stripe test mode and confirm the internal invoice becomes paid.
7. Verify the payment row is created or updated from the Stripe webhook.
8. Verify manual payment entry still works for the same claim.
9. If fee recovery is enabled, confirm it appears as a separate hosted invoice line item.
10. Confirm webhook retries do not duplicate the internal paid invoice state.

## Notes

- Keep SaaS subscription billing unchanged.
- Do not expose Stripe secrets in the UI or docs.
- Keep the client-billing layer conservative and easy to disable.
