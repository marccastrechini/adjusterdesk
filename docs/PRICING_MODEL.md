# Pricing Model

AdjusterDesk uses flat office pricing with active-user limits.

## Public Plans

- Solo: $49/month, 1 active user
- Small Office: $99/month, up to 3 active users
- Team: $199/month, up to 7 active users
- Professional/custom: manual, high-touch setup by request

## Active-User Counting Rule

- Active users count toward the office included-user limit.
- Inactive users stay in office history and do not count.
- Pending invited users count when they are active because they are provisioned seats.

## Enforcement Rules

- Active-user limit checks run on:
  - Creating a new user as active
  - Reactivating an inactive user
- Creating a user as inactive is allowed at the active-user limit.
- Existing owner safety remains in place:
  - Current signed-in user cannot deactivate self
  - Last active owner cannot be deactivated
- If an office is over the included-user limit, existing users can remain active, but new active adds/reactivations are blocked until the plan or limit is updated.

## Billing Scope

- Billing is manual for now.
- Stripe or in-app payment processing is intentionally out of scope for this pass.
- `subscriptionStatus` defaults to `MANUAL` until billing integrations are introduced.

## Internal Plan Fields

Each firm/workspace stores:

- `subscriptionPlan`
- `subscriptionStatus`
- `includedUserLimit`
- `trialEndsAt`
- `billingStartedAt`
- `billingCustomerId`
- `billingSubscriptionId`

`includedUserLimit` supports override scenarios and future custom agreements.

## Future Add-ons (Out of Scope for This Pass)

- Additional users and custom seat packs
- Migration help tiers
- AI features and automations
- Accounting integrations
