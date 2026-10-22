# Lifecycle Emails

This document defines the minimal customer-facing lifecycle email policy for PA ClaimBoard.

## Sender Policy

- Customer-facing lifecycle, onboarding, support, and product guidance emails must use `hello@paclaimboard.com`.
- Internal and admin operational emails may use `admin@paclaimboard.com` only when intentionally admin-only.
- Current app sender variables:
  - `SYSTEM_EMAIL_FROM` should be set to `"PA ClaimBoard <hello@paclaimboard.com>"`
  - `SYSTEM_EMAIL_REPLY_TO` should be set to `hello@paclaimboard.com`
  - `SYSTEM_ADMIN_EMAIL` is for internal admin notifications and should be `admin@paclaimboard.com`

## Implemented Sequence

Only the welcome email is implemented today.

- Immediately after successful self-service trial signup: welcome email.

## Proposed Sequence (Not Yet Implemented)

- Day 1: Use Today to avoid missed follow-ups.
- Day 3: Request or upload documents.
- Day 5: Track settlement, fee, and invoice status.

No scheduled lifecycle infrastructure is implemented yet. Keep this lightweight unless scheduling infrastructure is introduced.

## Welcome Email Details

- Subject: `Welcome to PA ClaimBoard - start with your first claim`
- Purpose: Help a new solo or small public adjusting office get value in the first five minutes.
- Key guidance in the body:
  1. Add your first lead or claim.
  2. Add the next follow-up.
  3. Open Today to see what needs attention.
- Links included:
  - `/start`
  - `/help`

## Deliverability And Domain Authentication

Outbound email sends through Resend. The sending domain is `paclaimboard.com` in `us-east-1`, and the return path is `send.paclaimboard.com`.

Before increasing lifecycle email volume:

- Verify sender identity for `hello@paclaimboard.com`.
- Verify SPF, DKIM, and DMARC alignment for `paclaimboard.com` and Resend.
- Keep one valid SPF record for the domain and merge providers as needed.
