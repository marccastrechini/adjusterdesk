# Build Plan

## Implementation Pass

1. Scaffold Next.js with TypeScript, App Router, Tailwind, and ESLint.
2. Install Prisma, Zod, Lucide icons, and small utility packages.
3. Add persistent project context and AI instruction files.
4. Define Prisma schema for the core AdjusterDesk records.
5. Seed Harbor Public Adjusting with a realistic water damage scenario.
6. Build a responsive app shell with sidebar, top bar, firm name, and demo user menu.
7. Build Today, Leads, Claims, Claim detail tabs, Money, Reports, Templates, Users, Import, and public Status routes.
8. Add server actions for lead creation, lead conversion, claim creation, tasks, documents, communications, settlement/payment/invoice records, templates, users, and CSV import.
9. Add CSV export route handlers for leads, claims, and invoices.
10. Add README setup instructions and environment example.
11. Run Prisma generation, database push, seed, lint, typecheck, and build where practical.
12. Fix errors introduced during the pass.

## MVP Decisions

- Demo authentication uses the first seeded firm and owner user for local development.
- Amounts are stored as integer cents to avoid floating point money mistakes.
- Fee percentage is stored in basis points, where 1000 means 10%.
- Local uploaded files are stored under `storage/uploads` during development and excluded from Git.
- The app is intentionally monolithic for readability and speed.
