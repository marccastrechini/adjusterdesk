# Self-Service Readiness

This document covers the staged self-service launch path for AdjusterDesk.

## Launch Gate

- `SELF_SERVICE_SIGNUP_ENABLED=false` keeps public self-service signup off.
- In production, keep the flag off until signup and billing checks are validated.
- Public CTAs automatically fall back to request access when self-service is off.

## Billing Mode

- `BILLING_PROVIDER=manual`:
  - Signup can create workspace + owner directly when self-service flag is on.
  - Workspace is created with `subscriptionStatus=MANUAL`.
- `BILLING_PROVIDER=stripe`:
  - Requires full Stripe configuration.
  - Signup creates a pending intent and routes to Stripe Checkout.
  - Workspace owner is created only after successful checkout completion.

## Required Environment Variables

- `SELF_SERVICE_SIGNUP_ENABLED`
- `BILLING_PROVIDER`
- `APP_BASE_URL`
- `AUTH_SECRET`

For Stripe mode, also configure:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_SOLO_MONTHLY`
- `STRIPE_PRICE_SMALL_OFFICE_MONTHLY`
- `STRIPE_PRICE_TEAM_MONTHLY`

## Safe Fallback Behavior

- If self-service is disabled, CTAs route to `/demo` (request access).
- If Stripe mode is selected but Stripe config is incomplete, CTAs route to `/demo`.
- `/signup` renders a safe request-access fallback when self-service is unavailable.

## Local Test Checklist

1. Set `SELF_SERVICE_SIGNUP_ENABLED=false` and verify public CTAs route to request access.
2. Set `SELF_SERVICE_SIGNUP_ENABLED=true`, `BILLING_PROVIDER=stripe`, leave Stripe vars empty, verify fallback remains safe.
3. Set `SELF_SERVICE_SIGNUP_ENABLED=true`, `BILLING_PROVIDER=manual`, verify workspace owner signup works and routes to `/start`.
4. Configure Stripe vars, verify checkout starts and `/signup/success` provisions owner workspace.
5. Verify `/settings/billing` renders safely in each mode.

## Production Rollout Checklist

1. Create production backup.
2. Deploy code and schema updates without enabling self-service.
3. Confirm public pricing and signup fallback behavior.
4. Confirm login, users, and billing settings pages still function.
5. Enable `SELF_SERVICE_SIGNUP_ENABLED=true` only when Stripe/manual billing path is validated.
6. Re-run smoke checks after enablement.

## Remaining Manual Operations

- Subscription plan change support may still be handled manually.
- Manual billing mode continues to use support workflow for billing adjustments.
- Stripe customer portal is available only for Stripe-linked workspaces with customer IDs.
