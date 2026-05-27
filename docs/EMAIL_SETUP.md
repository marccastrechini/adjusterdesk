# Email Setup (IONOS + GoDaddy + Resend)

This document defines how email is split for AdjusterDesk on `adjusterdesk.xyz`.

## Roles And Addresses

- Operator login address: `admin@adjusterdesk.xyz`
- Outbound system email address: `hello@adjusterdesk.xyz`
- App public domain: `adjusterdesk.xyz`

## Service Ownership

- IONOS hosts mailbox/inbound email for `admin@adjusterdesk.xyz` and `hello@adjusterdesk.xyz`.
- GoDaddy is the DNS host where domain records are managed.
- Resend is the transactional sender for app-generated email.

## DNS Rules

1. Do not remove existing IONOS MX records.
2. Add the Resend domain verification records in GoDaddy DNS.
3. Keep SPF to a single record for the root domain.

Important: SPF must not be duplicated. Merge providers into one SPF record as needed.

## Environment Variables

Set these in local `.env` only. Do not commit API keys or generated secrets.

```dotenv
APP_BASE_URL=http://localhost:3000
EMAIL_PROVIDER=resend
RESEND_API_KEY=
SYSTEM_EMAIL_FROM="AdjusterDesk <hello@adjusterdesk.xyz>"
SYSTEM_EMAIL_REPLY_TO=hello@adjusterdesk.xyz
PASSWORD_RESET_TOKEN_MINUTES=30
SYSTEM_ADMIN_EMAIL=admin@adjusterdesk.xyz
```

For future public hosting, change only:

```dotenv
APP_BASE_URL=https://adjusterdesk.xyz
```

`RESEND_API_KEY` belongs only in `.env` (or deployment secrets), never in source control.

## App Behavior Targets

- Password reset links should use `APP_BASE_URL`.
- Invitation links should use `APP_BASE_URL`.
- App-sent system email should use `hello@adjusterdesk.xyz` as From and Reply-To.
- Operator/admin login should use `admin@adjusterdesk.xyz`.
- All system emails should use the shared renderer in `src/lib/email-template.ts` so styling, tone, and plain-text fallback stay consistent.
- System email templates must use inline CSS only (no external stylesheets, images, tracking pixels, or remote fonts).

## Implemented Password Reset Flow

- Request page: `/forgot-password`
- Reset page: `/reset-password?token=<token>`
- Reset emails are plain-text and sent through Resend using:

- Reset emails now use the shared system renderer for both HTML and plain-text output and are sent through Resend using:
	- `SYSTEM_EMAIL_FROM="AdjusterDesk <hello@adjusterdesk.xyz>"`
	- `SYSTEM_EMAIL_REPLY_TO=hello@adjusterdesk.xyz`

## Implemented Invite Flow

- Invite acceptance page: `/accept-invite?token=<token>`
- Invite emails use the shared system email renderer with one-time token links.
- Token hashes are stored in the database; raw invite tokens are only in email links.

## Test Steps

1. Open `/forgot-password`.
2. Submit an active user email.
3. Confirm the page always shows the same generic success notice.
4. If `RESEND_API_KEY` is missing, confirm the app does not crash and logs a clear setup error.
5. If `RESEND_API_KEY` is configured, confirm the reset email arrives.
6. Open the reset link and set a new password.
7. Confirm old password sign-in fails.
8. Confirm new password sign-in works.
9. Confirm `/settings/account` password change still works after reset.
10. Confirm system admin sign-in still works for `admin@adjusterdesk.xyz`.