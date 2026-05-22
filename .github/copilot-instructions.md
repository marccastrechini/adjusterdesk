# AdjusterDesk Coding Instructions

AdjusterDesk is a simple workspace for small public adjusting offices. Build for solo to 5-person public adjusting firms that currently rely on spreadsheets, email, text messages, folders, QuickBooks, calendar reminders, and memory.

## Product Language

Use plain public-adjuster terms in UI and docs: Claim, Client, Property, Policy, Carrier, Adjuster, Follow-up, Deadline, Documents, Photos, Settlement, Check, Fee, Invoice.

Avoid customer-facing jargon such as object model, orchestration, enterprise workflow engine, SLA, pipeline configuration, autonomous AI adjuster, legal advice, automated coverage determination, and claim valuation advice.

## Architecture Direction

- Next.js App Router with TypeScript and React.
- Tailwind CSS for styling with simple accessible components.
- Prisma with SQLite for local development, keeping the schema portable to Postgres later.
- Server components for reads and server actions or route handlers for writes.
- Zod for server-side validation.
- Local development storage through `src/lib/storage.ts`; uploaded files must stay out of Git.
- Demo authentication is intentionally simple: seeded demo users scoped to a seeded firm.

## Engineering Preferences

- Keep the app monolithic and readable for the MVP.
- Scope all records by firm where practical.
- Prefer useful seeded screens over placeholder-only pages.
- Keep UI low-tech friendly and operational, not flashy or sales-oriented.
- Do not hardcode production secrets.
- Do not commit local database files or uploaded documents.
