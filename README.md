# AdjusterDesk

AdjusterDesk is a simple workspace for small public adjusting offices. The local MVP helps a solo to 5-person office track Claims, Clients, Properties, Policies, Carriers, Adjusters, Follow-ups, Deadlines, Documents, Photos, Settlements, Checks, Fees, and Invoices.

The app is intentionally local-first for this MVP: Next.js App Router, TypeScript, Tailwind CSS, Prisma, SQLite, seeded demo users, and local development uploads.

## What Works

- Today dashboard for overdue tasks, due today, upcoming deadlines, carrier follow-ups, unpaid receivables, and recent claims.
- Guided Start checklist for first-run setup, spreadsheet import, demo reset guidance, and pilot feedback.
- Lead intake, lead list/search/filter, lead detail, follow-up tasks, communication notes, and conversion to claim.
- Claim list/search/filter, claim creation, claim overview, task editing/completion, documents/photos upload metadata, communication log, and money tab.
- Settlement rounds, payments/checks, fee percentage calculation, invoices, and office-wide receivables.
- Reports for claim status, overdue tasks, upcoming deadlines, leads by source, and outstanding receivables.
- Templates and demo user management.
- Authenticated Resources area with office starters, task defaults, document request starters, and CSV cleanup guidance.
- Lightweight pilot feedback capture saved inside the workspace.
- Forgot-password and reset-password flow with transactional Resend email.
- Secure user invitation flow for workspace onboarding with one-time accept-invite links.
- Public client status page by token with requested documents and upload form.
- CSV export for leads, claims, and invoices.
- Spreadsheet import for leads and claims with templates, row review, and plain validation messages.

## Setup

For a Windows local demo/staging host with backup and restore steps, see `docs/LOCAL_HOSTING.md`.
For a persistent local production runtime on the main demo machine, see `docs/LOCAL_PRODUCTION.md`.
For the fixed production demo workspace bootstrap, see `docs/PRODUCTION_DEMO_BOOTSTRAP.md`.
For a guided pilot walkthrough, see `docs/DEMO_SCRIPT.md`.
For a concise pilot safety/readiness checklist, see `docs/PILOT_READINESS.md`.
For local pilot workspace and owner provisioning, see `docs/WORKSPACE_ADMIN.md`.
For local global system admin console usage, see `docs/SYSTEM_ADMIN.md`.
For domain/email configuration (IONOS + GoDaddy + Resend), see `docs/EMAIL_SETUP.md`.

1. Copy the matching environment template:

```powershell
Copy-Item .env.development.example .env.development.local
Copy-Item .env.production.example .env.production.local
```

Use `.env.development.local` for debugger/dev work and `.env.production.local` for the public local demo runtime. Both are ignored by Git.

2. Install dependencies:

```bash
npm install
```

3. Create the local SQLite database and seed demo data:

```bash
npm run schema:apply:local
npm run db:seed
```

Seeded office sign-in credentials after `npm run db:seed`:

- `dana@harboradjusting.example` / `AdjusterDeskDemo123!`
- `luis@harboradjusting.example` / `AdjusterDeskDemo123!`
- `kim@harboradjusting.example` / `AdjusterDeskDemo123!`

The seeded inactive user (`avery@harboradjusting.example`) cannot sign in.

4. Start the development server:

```bash
npm run dev:local
```

Open `http://localhost:3000`.

`AUTH_SECRET` should be set before any shared or pilot deployment. If it is missing in local development, AdjusterDesk falls back to an insecure built-in signing secret so the seeded credentials flow still works locally.

## Demo URLs

- Login: `http://localhost:3000/login`
- Workspace: `http://localhost:3000/today` (after sign-in)
- Start checklist: `http://localhost:3000/start` (after sign-in)
- Spreadsheet import: `http://localhost:3000/start/import` (after sign-in)
- Leads: `http://localhost:3000/leads`
- Claims: `http://localhost:3000/claims`
- Money: `http://localhost:3000/money`
- Reports: `http://localhost:3000/reports`
- Office resources: `http://localhost:3000/office-resources`
- Pilot feedback: `http://localhost:3000/feedback`
- Client status: `http://localhost:3000/status/sarah-water-demo`

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:generate
npm run db:push
npm run schema:apply:local
npm run prod:schema:apply -- -ConfirmProductionSchema
npm run db:seed
npm run db:studio
npm run demo:reset:local -- -ConfirmReset
npm run demo:readiness -- --base-url http://localhost:3000
npm run prod:demo:readiness
```

`schema:apply:local` and `prod:schema:apply -- -ConfirmProductionSchema` are the current Prisma schema apply commands for this SQLite MVP. There is no Prisma migration history yet, so do not use `prisma migrate deploy` for this project until migrations are introduced.

`demo:reset:local` is destructive and only safe for local development demo/training data. It creates a local backup before reseeding unless the script is explicitly run with its skip-backup option. Full production reseeding is blocked; use `prod:demo:bootstrap -- -ConfirmProductionDemo` for the firm-scoped production demo workspace refresh.

## Local Data

- Development SQLite database: `prisma/dev.db`
- Development uploads: `storage/uploads-development`
- Production SQLite database: `prisma/production.db`
- Production uploads: `storage/uploads-production`

Both are ignored by Git. Keep uploaded documents and local database files out of commits.

## Spreadsheet Import

Use `/start/import` for first-office spreadsheet import. `/settings/import` remains available and uses the same review flow.

Download a starter leads or claims template, fill it out, upload the CSV, then review the rows before importing. Rows marked Ready can be imported; rows marked Needs work are skipped until the office fixes the missing or unclear details. A sample office lead list is available at `/api/import-template/sample-office-leads` for demos and training.

Lead columns: `firstName`, `lastName`, `email`, `phone`, `address1`, `city`, `state`, `postalCode`, `source`, `referralSource`, `lossType`, `dateOfLoss`, `followUpDate`, `notes`.

Claim columns: `firstName`, `lastName`, `email`, `phone`, `address1`, `city`, `state`, `postalCode`, `carrierName`, `policyNumber`, `claimNumber`, `lossType`, `dateOfLoss`, `reportedDate`, `inspectionDate`, `deadlineDate`, `notes`.

## MVP Boundaries

AdjusterDesk does not provide legal advice, automated coverage determinations, claim valuation advice, or autonomous adjusting. It is an office workspace and tracking system.

Production authentication, billing, carrier integrations, QuickBooks sync, email/SMS sending, and advanced permissions are intentionally outside this local MVP pass.

## Pilot Deployment Readiness

Before inviting real pilot users, review the practical checklist in `docs/pilot-deployment-checklist.md`.
For operator-facing demo and pilot guardrails, also review `docs/DEMO_SCRIPT.md` and `docs/PILOT_READINESS.md`.
For the production run/update/task workflow on the local machine, review `docs/LOCAL_PRODUCTION.md`.

Minimum production/demo update flow:

```powershell
npm run prod:backup:local
npm run prod:schema:apply -- -ConfirmProductionSchema
npm run build
npm run prod:task:stop -- -ConfirmStop
npm run prod:task:start
npm run prod:demo:readiness
```

Before merging or pushing a demo-readiness change, keep these checks green:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:smoke
```
