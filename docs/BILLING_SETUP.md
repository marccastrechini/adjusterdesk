# Billing Setup

For a step-by-step local setup, use docs/STRIPE_TEST_MODE_RUNBOOK.md.

AdjusterDesk supports two billing modes:

- `manual`
- `stripe`

Current rollout posture:

- Customers can start using AdjusterDesk now.
- Billing begins only after the first full calendar month of usage.
- Example: activation on June 18 means July is the first full month, so billing begins no earlier than August 1.
- Live Stripe card collection is not active in this pass.

## 1) Manual Mode

Environment:

- `BILLING_PROVIDER=manual`
- `SELF_SERVICE_SIGNUP_ENABLED=true` (optional, for public self-service)

Behavior:

- Public signup can create workspace owner directly.
- Workspace is saved with `subscriptionStatus=MANUAL`.
- Billing changes are handled by support.

## 2) Stripe Mode

This document covers Stripe configuration shape. For current implementation work, use Stripe test mode only.

Environment:

- `BILLING_PROVIDER=stripe`
- `SELF_SERVICE_SIGNUP_ENABLED=true`
- `APP_BASE_URL` (must be public HTTPS URL in production)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_SOLO_MONTHLY`
- `STRIPE_PRICE_SMALL_OFFICE_MONTHLY`
- `STRIPE_PRICE_TEAM_MONTHLY`

Behavior:

- `/signup` creates pending signup intent and redirects to Stripe Checkout.
- `/signup/success` completes workspace owner provisioning after successful checkout.
- `/api/stripe/webhook` updates internal subscription status and can complete provisioning idempotently.

## Stripe Product/Price Requirements

Create one recurring monthly Stripe Price for each public plan:

- Solo ($49/month)
- Small Office ($99/month)
- Team ($199/month)

Copy each Stripe `price_...` ID into the matching environment variable.

Recommended Stripe test-mode product names:

- AdjusterDesk Solo
- AdjusterDesk Small Office
- AdjusterDesk Team

## Webhook Endpoint

- Endpoint: `/api/stripe/webhook`
- Local testing endpoint via Stripe CLI forwarding: `http://localhost:3000/api/stripe/webhook`
- Required events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

## Internal Subscription Status Mapping

- Stripe `trialing` -> `TRIAL`
- Stripe `active` -> `ACTIVE`
- Stripe `past_due`, `unpaid`, `incomplete`, `incomplete_expired` -> `PAST_DUE`
- Stripe `canceled` -> `CANCELED`
- Unknown -> `MANUAL`

## Safety Notes

- Production standard keeps `SELF_SERVICE_SIGNUP_ENABLED=true`.
- Set `SELF_SERVICE_SIGNUP_ENABLED=false` only when you need to temporarily close public signup.
- If Stripe config is incomplete, keep billing setup on manual terms and avoid enabling card collection.
- Do not run production demo reset/bootstrap/seed operations on real production data.
