# AdjusterDesk

AdjusterDesk is a simple workspace for small public adjusting offices. The local MVP helps a solo to 5-person office track Claims, Clients, Properties, Policies, Carriers, Adjusters, Follow-ups, Deadlines, Documents, Photos, Settlements, Checks, Fees, and Invoices.

The app is intentionally local-first for this MVP: Next.js App Router, TypeScript, Tailwind CSS, Prisma, SQLite, seeded demo users, and local development uploads.

## What Works

- Today dashboard for overdue tasks, due today, upcoming deadlines, carrier follow-ups, unpaid receivables, and recent claims.
- Lead intake, lead list/search/filter, lead detail, follow-up tasks, communication notes, and conversion to claim.
- Claim list/search/filter, claim creation, claim overview, task editing/completion, documents/photos upload metadata, communication log, and money tab.
- Settlement rounds, payments/checks, fee percentage calculation, invoices, and office-wide receivables.
- Reports for claim status, overdue tasks, upcoming deadlines, leads by source, and outstanding receivables.
- Templates and demo user management.
- Public client status page by token with requested documents and upload form.
- CSV export for leads, claims, and invoices.
- Basic CSV import for leads and claims.

## Setup

1. Copy the environment file if needed:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Create the local SQLite database and seed demo data:

```bash
npm run db:push
npm run db:seed
```

Seeded office sign-in credentials after `npm run db:seed`:

- `dana@harboradjusting.example` / `AdjusterDeskDemo123!`
- `luis@harboradjusting.example` / `AdjusterDeskDemo123!`
- `kim@harboradjusting.example` / `AdjusterDeskDemo123!`

The seeded inactive user (`avery@harboradjusting.example`) cannot sign in.

4. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

`AUTH_SECRET` should be set before any shared or pilot deployment. If it is missing in local development, AdjusterDesk falls back to an insecure built-in signing secret so the seeded credentials flow still works locally.

## Demo URLs

- Login: `http://localhost:3000/login`
- Workspace: `http://localhost:3000/today` (after sign-in)
- Leads: `http://localhost:3000/leads`
- Claims: `http://localhost:3000/claims`
- Money: `http://localhost:3000/money`
- Reports: `http://localhost:3000/reports`
- Client status: `http://localhost:3000/status/sarah-water-demo`

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:generate
npm run db:push
npm run db:seed
npm run db:studio
```

## Local Data

- SQLite database: `prisma/dev.db`
- Development uploads: `storage/uploads`

Both are ignored by Git. Keep uploaded documents and local database files out of commits.

## CSV Import

Use `/settings/import` for basic CSV imports.

Lead columns: `firstName`, `lastName`, `email`, `phone`, `address1`, `city`, `state`, `postalCode`, `source`, `referralSource`, `lossType`, `dateOfLoss`, `followUpDate`, `notes`.

Claim columns: `firstName`, `lastName`, `email`, `phone`, `address1`, `city`, `state`, `postalCode`, `carrierName`, `policyNumber`, `claimNumber`, `lossType`, `dateOfLoss`.

## MVP Boundaries

AdjusterDesk does not provide legal advice, automated coverage determinations, claim valuation advice, or autonomous adjusting. It is an office workspace and tracking system.

Production authentication, billing, carrier integrations, QuickBooks sync, email/SMS sending, and advanced permissions are intentionally outside this local MVP pass.

## Pilot Deployment Readiness

Before inviting real pilot users, review the practical checklist in `docs/pilot-deployment-checklist.md`.
