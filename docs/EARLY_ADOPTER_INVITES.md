# Early adopter invites

Marc can give a few people free PA ClaimBoard access in exchange for feedback. The invite does not collect a card and does not open Stripe Checkout.

## Send an invite

1. Sign in as a system admin.
2. Open **Early adopters** (`/system/early-adopters`).
3. Enter an email, and optionally a name, a private note, and an expiry of 1 to 90 days. The default is 30 days.
4. Send the invite.

The app emails a single-use link from `SYSTEM_EMAIL_FROM` with Reply-To `SYSTEM_EMAIL_REPLY_TO`. The link uses `APP_BASE_URL`, for example `https://paclaimboard.com/early-access?token=...`.

The same page shows the link for a few minutes so it can be copied. Copying a new link, or resending, replaces the previous link. The database stores only a hash of the token.

If the email provider rejects the send, the invite is still saved and the link can be copied.

## What the person does

- A new email registers an office name, their name, and a password. That creates an office on the **Early adopter** plan.
- An email that already has an unpaid account signs in, then activates early access on that existing office. One email can belong to only one office, so this does not create a second workspace.
- A different signed-in email is blocked. The invite stays unused.
- An email that already has a Stripe subscription, or an Active or Past due plan, is blocked so paid billing is not overwritten.

The office is `EARLY_ADOPTER` with status `MANUAL`, five included users, no trial end, and no Stripe customer or subscription. There is no trial banner and no checkout button. To move the office onto paid billing later, open the workspace in system admin and change the plan and subscription status. That does not start Stripe by itself.

## Invite list

The list shows pending, redeemed, expired, and revoked invites. Redeemed rows show who redeemed the invite and when. Pending and expired invites can be resent, revoked, or replaced with a copyable link. A redeemed invite cannot be used again.

## Production database

This adds the `EarlyAdopterInvite` table and the `EARLY_ADOPTER` plan value. There is no migration history in this repo. On the VPS, after `git pull` and before `npm run build`, apply the schema to the production SQLite file:

```bash
APP_ENV=production npx prisma db push
```

`APP_ENV=production` makes Prisma load `.env.production.local`, including `DATABASE_URL`. Then continue with `npm ci` if needed, `npm run build`, and `systemctl restart`.

Do not point this command at a database other than the production SQLite file named by that env file.
