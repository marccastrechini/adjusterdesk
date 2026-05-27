# Agent Progress

## Completed

- Inspected the repository and confirmed it was empty except for Git metadata.
- Confirmed the GitHub remote points to `https://github.com/marccastrechini/adjusterdesk.git`.
- Scaffolded a Next.js App Router project with TypeScript, Tailwind, ESLint, and npm.
- Installed MVP dependencies: Prisma, Zod, Lucide icons, clsx, tailwind-merge, and tsx.
- Created persistent AI and project context files.
- Added Prisma schema for firm-scoped leads, claims, tasks, documents, communications, settlements, payments, fee rules, invoices, public status tokens, and templates.
- Created and seeded the local SQLite database with Harbor Public Adjusting demo data.
- Built the app shell with sidebar navigation, top bar, firm name, and demo user menu.
- Built Today, Leads, Claims, claim tabs, Money, Reports, Settings, CSV Import, and public Status routes.
- Added server actions for core lead, claim, task, document, communication, money, template, user, CSV import, and status upload workflows.
- Added CSV export route handlers for leads, claims, and invoices.
- Replaced the generated README with AdjusterDesk setup and MVP notes.
- Completed a QA walkthrough of all required routes, claim tabs, public status pages, sidebar navigation, and CSV exports.
- Polished navigation grouping, demo-user display, receivable labels, document storage wording, inactive-user creation, and demo data depth.
- Added a `prisma:generate` script alias so the repo supports the requested Prisma verification command.
- Clarified claim money tracking with explicit calculated-fee and payment-received fields on claim money views.
- Renamed the Today receivables section to surface outstanding money items more clearly from the claim money workflow.
- Added a simple claim deadline editor to the claim tasks page so deadline dates and next steps can be maintained with the task workflow.
- Strengthened Today with an upcoming-deadlines summary card and clearer overdue/due-today task badges.
- Updated seeded claim task and deadline demo data so the office starts with visible overdue work, due-today work, and an upcoming claim deadline.

## In Progress

- No active implementation work.

## Verified

- Browser smoke-tested all required MVP routes, claim tabs, sidebar navigation, public status pages, and CSV export links.
- Ran `npm run db:seed`, `npm run lint`, `npm run typecheck`, and `npm run build` after the polish pass.
- Re-verified `npm run prisma:generate` and `npm run typecheck` after the money-tracking updates.
- Browser smoke-tested `Today` and a claim money page with the seeded unpaid receivables visible.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` before the task/deadline slice.
- Ran `npm run prisma:generate`, `npm run db:seed`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` after the task/deadline slice.
- Browser smoke-tested `/today`, the Elena Martinez claim overview, and that claim's `/tasks` page with the new deadline editor visible.

## Known Notes

- npm reported moderate dependency audit findings during package installation. These are dependency-tree audit items and were not force-upgraded during scaffold work.

## Next Recommended Slice

- Add a simple office reports slice for overdue tasks and upcoming claim deadlines so the Today worklist and Reports stay aligned.
