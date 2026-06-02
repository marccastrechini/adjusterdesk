# Stripe Test Mode Runbook

This runbook prepares AdjusterDesk for Stripe test mode only.

## Scope and Safety

- Use Stripe test mode keys only.
- Do not use live Stripe keys.
- Do not commit secrets to Git.
- Keep production self-service signup disabled unless explicitly approved.
- Do not run production demo bootstrap/reset/seed commands.
- Keep public billing promise unchanged: billing begins after the first full calendar month of usage.

## Required Environment Values

Set these values when testing Stripe mode:

- APP_BASE_URL (or environment fallback via APP_ENV, but explicit APP_BASE_URL is recommended)
- SELF_SERVICE_SIGNUP_ENABLED=true (local testing only)
- BILLING_PROVIDER=stripe
- STRIPE_SECRET_KEY=sk_test_...
- STRIPE_WEBHOOK_SECRET=whsec_...
- STRIPE_PRICE_SOLO_MONTHLY=price_...
- STRIPE_PRICE_SMALL_OFFICE_MONTHLY=price_...
- STRIPE_PRICE_TEAM_MONTHLY=price_...

Recommended local baseline values:

- APP_ENV=development
- APP_BASE_URL=http://127.0.0.1:3000
- SELF_SERVICE_SIGNUP_ENABLED=true
- BILLING_PROVIDER=stripe

## Stripe Dashboard Setup (Test Mode)

In Stripe Dashboard, ensure Test mode is enabled.

Create products and monthly recurring prices:

1. Product: AdjusterDesk Solo
2. Price: 49 USD monthly recurring
3. Save generated price ID to STRIPE_PRICE_SOLO_MONTHLY

1. Product: AdjusterDesk Small Office
2. Price: 99 USD monthly recurring
3. Save generated price ID to STRIPE_PRICE_SMALL_OFFICE_MONTHLY

1. Product: AdjusterDesk Team
2. Price: 199 USD monthly recurring
3. Save generated price ID to STRIPE_PRICE_TEAM_MONTHLY

## Webhook Setup

Endpoint path in app:

- /api/stripe/webhook

Required events:

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed

Future production endpoint URL:

- https://adjusterdesk.xyz/api/stripe/webhook

Local testing options:

1. Stripe CLI forwarding (recommended)
2. Dashboard test webhook endpoint pointing to a tunnel URL

## Stripe CLI (Local)

Install Stripe CLI (example options):

- Windows with winget: winget install Stripe.StripeCLI
- macOS with Homebrew: brew install stripe/stripe-cli/stripe
- Linux: follow Stripe CLI install docs

Authenticate:

- stripe login

Forward webhooks to local app:

- stripe listen --forward-to localhost:3000/api/stripe/webhook

Copy the generated signing secret shown by stripe listen and set:

- STRIPE_WEBHOOK_SECRET=whsec_...

## Local Run Steps

1. Copy env sample into local private env file (do not commit):
   - .env.development.local
2. Fill Stripe test values listed above.
3. Start the app:
   - npm run dev -- -H 127.0.0.1 -p 3000
4. Confirm signup and pricing pages load.
5. Confirm billing page loads safely even if Stripe values are incomplete.

## Test Checkout Success

1. Open /pricing and choose a plan.
2. Complete signup form at /signup.
3. Confirm redirect to Stripe Checkout.
4. Use Stripe test card:
   - 4242 4242 4242 4242
   - Any future expiry
   - Any CVC
   - Any ZIP/postal code
5. Submit payment.
6. Verify redirect to /signup/success and workspace provisioning.
7. Verify billing details at /settings/billing.

## Test Checkout Cancel

1. Start from /signup.
2. On Stripe Checkout, cancel and return.
3. Verify /signup/cancel displays safe cancellation copy.
4. Verify no paid activation occurs.

## Test Webhook Updates

1. Keep stripe listen running.
2. Complete checkout and confirm checkout.session.completed is forwarded.
3. In Stripe test dashboard, trigger subscription update/delete scenarios.
4. Trigger invoice.payment_failed using Stripe test events.
5. Verify workspace billing status updates in /settings/billing.

## Verification Checklist

- /pricing loads and keeps first-full-calendar-month billing promise.
- /signup shows safe fallback if Stripe mode is incomplete.
- /signup/success remains safe when Stripe session cannot be finalized.
- /settings/billing shows Stripe readiness/missing setup safely.
- /api/stripe/webhook returns 503 when Stripe mode is incomplete (no crash).

## What Not To Do

- No live keys in any environment during this phase.
- No production self-service enablement without explicit approval.
- No committed secrets in .env files.
- No production deploy for this test-mode setup task.
- No real card details; use Stripe test cards only.
