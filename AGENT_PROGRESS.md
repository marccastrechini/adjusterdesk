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

## In Progress

- Running lint, typecheck, build, and final cleanup.

## Known Notes

- npm reported moderate dependency audit findings during package installation. These are dependency-tree audit items and were not force-upgraded during scaffold work.
