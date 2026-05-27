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
- Updated the lead-to-claim conversion flow so opening a claim creates the first claim follow-up task, closes any open lead tasks, and refreshes Today immediately.
- Expanded the lead conversion form with plain-language first-follow-up fields so the office can set the first claim touch during conversion.
- Refreshed the Robert Hale demo lead so the seeded story clearly shows a ready-to-convert lead that becomes an active claim with a same-day follow-up.
- Hardened the MVP demo loop with clearer plain-language copy across Today, Leads, Claims, and Money so each page explains why an item is showing and what the next office action should be.
- Updated lead and claim list cards to surface notes and next-step context so the seeded demo story reads cleanly without clicking through every record first.
- Renamed the claim workspace tab from Communications to Notes so the claim routes use the same plain-language label as the rest of the app.
- Added a local hosting setup for the main demo computer with a stronger `.env.example`, Windows local-hosting guide, and a PowerShell backup script for the SQLite database, uploads, and optional `.env` file.
- Added small safe local-hosting script aliases for starting the built app on the LAN and creating a local backup bundle.
- Added `docs/LOCAL_HOSTING.md` with Windows local hosting steps for Node, install/build/start, persistent `AUTH_SECRET`, LAN access notes, data locations, backup/restore, and a local production smoke checklist.
- Added `scripts/backup-local.ps1` and validated it creates timestamped backup folders for local database files, uploads, and optional `.env`.
- Added guarded local data safety scripts: `scripts/restore-local.ps1` for explicit restore and `scripts/demo-reset-local.ps1` for explicit demo reset with backup-by-default behavior.
- Added local workflow aliases `restore:local` and `demo:reset:local` and updated local hosting docs to use explicit confirmation for restore/reset operations.
- Polished claim document storage UX with clearer claim-file context, category/file/date/uploader details, and plain-language empty states on the claim documents page.
- Added local file guardrails for claim documents so records pointing to missing files are clearly flagged and do not expose a broken download action.
- Updated document creation behavior so "requested from client" records are no longer marked as received immediately.
- Updated local hosting docs with a note about handling "Local file missing" document records after restore or cleanup.
- Added `docs/DEMO_SCRIPT.md` with a plain-English 10-15 minute pilot walkthrough from sign-in through lead intake, lead conversion, claim tasks/deadlines, documents, client status, money, and Today coherence.
- Updated `README.md` setup guidance to link the new pilot walkthrough script.
- Added a local admin provisioning script at `scripts/create-workspace-owner.ts` to create a new workspace and owner user without manual SQLite edits.
- Added `npm run admin:create-workspace` for transactional workspace and owner provisioning from the command line.
- Added `docs/WORKSPACE_ADMIN.md` with backup-first workspace provisioning steps, owner login verification flow, and demo-reset safety guidance for real pilot data.
- Updated `README.md` setup guidance to link the new workspace admin guide.
- Added a local admin password reset script at `scripts/reset-user-password.ts` to reset any user's password by email without manual SQLite edits.
- Added `npm run admin:reset-password` alias.
- Updated `docs/WORKSPACE_ADMIN.md` with reset instructions, required/optional inputs, safety notes, and guidance to rotate after first sign-in.
- Added a local-only global system admin permission via `User.isSystemAdmin` so system access is separate from workspace `OWNER` role.
- Added hidden system admin routes: `/system`, `/system/workspaces`, and `/system/workspaces/[id]`.
- Added system dashboard metrics for workspace count, active user count, and basic local install status.
- Added system workspace listing with owner user/email, user count, lead count, claim count, and created date.
- Added system workspace detail with workspace info, owner user, user list, lead/claim totals, and global user admin actions.
- Added system admin web actions for creating a workspace with owner user, updating owner/user email, generated temporary password reset (shown once), and deactivate/reactivate user.
- Added `docs/SYSTEM_ADMIN.md` and linked it from `README.md` and `docs/WORKSPACE_ADMIN.md`.

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
- Ran `npm run typecheck`, `npm run prisma:generate`, `npm run db:seed`, `npm run test`, `npm run lint`, and `npm run build` for the lead conversion slice.
- Browser smoke-tested `/leads`, converted the Robert Hale lead into a claim, confirmed the new claim task on the claim overview, and confirmed Today shows the new claim follow-up without the old lead task.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` before the MVP demo hardening pass.
- Ran `npm run prisma:generate`, `npm run db:seed`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` after the MVP demo hardening pass.
- Browser smoke-tested `/today`, `/leads`, converted the Robert Hale lead to a claim, checked the new claim overview, checked that claim's `/tasks` and `/money` pages, checked `/money`, and confirmed Today then showed the new Robert Hale claim follow-up with the lead removed from due follow-ups.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` before the local hosting setup slice.
- Ran `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` after the local hosting setup slice.
- Browser smoke-tested the built app started with `npm run start` using a non-temporary `AUTH_SECRET` from local `.env`, then signed in and checked `/today`, `/leads`, one claim overview, claim `/tasks`, claim `/money`, and `/money`.
- Ran `npm run backup:local` and confirmed backup output was created under `backups/`.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` before the local restore workflow slice.
- Ran `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` after the local restore workflow slice.
- Ran `npm run demo:reset:local -- -ConfirmReset` and confirmed it warns, creates a safety backup, and reseeds successfully.
- Validated `npm run restore:local` against a temporary target folder and confirmed database and uploads restore behavior without touching live data.
- Browser smoke-tested the built app on port 3001 (`npm run start -- --port 3001`), signed in, and verified `/today`, `/leads`, one claim overview, claim `/tasks`, claim `/money`, and `/money`.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` before the document-storage polish slice.
- Ran `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` after the document-storage polish slice.
- Browser smoke-tested on the updated build (`npm run start -- --port 3001` because port 3000 was already in use), signed in, opened one claim documents page, uploaded a small test file, and confirmed the new record rendered with Open/Download action and claim-file metadata.
- Ran `npm run backup:local` again after the upload and confirmed the backup includes the uploaded file in the copied storage folder.
- Ran `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` after the MVP demo-script slice.
- Browser smoke-tested the full demo path end-to-end on `npm run start`: `/today` -> `/leads/new` intake -> lead conversion to claim -> claim `/tasks` deadline update -> claim `/documents` upload and Open/Download link -> claim `/client-status` link creation and public status-page preview -> `/money` -> `/today` coherence check.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` before the local workspace provisioning slice.
- Ran `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` after the local workspace provisioning slice.
- Manual smoke-tested local provisioning and firm isolation on port 3001: ran `npm run admin:create-workspace -- --workspace-name "Stark Loss" --owner-name "Steve Reardon" --owner-email "steve.reardon.test@starkloss.example"`, signed in as the new owner, confirmed Stark Loss loaded as a clean workspace, created one new lead, then signed back in as demo owner Dana Morris and confirmed Harbor demo data remained separate.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` before the local password reset slice.
- Ran `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` after the local password reset slice.
- Confirmed `admin:reset-password` returns a clear error when the email does not exist.
- Manual smoke-tested password reset: ran `npm run admin:reset-password -- --email "sreardon@starkloss.example"`, used the generated temporary password to sign in as Steve Reardon, confirmed Stark Loss Adjusting workspace loaded clean, signed out, signed in as demo owner Dana Morris, and confirmed Harbor Public Adjusting data remained separate.
- Ran `node -v`, `npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` before coding the system admin console slice.
- Ran `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run backup:local` after coding the system admin console slice.
- Ran `npm run db:push` after schema changes and applied a local SQL update so Dana is marked as system admin in the existing local database.
- Manual smoke-tested on `npm run dev` port 3002: signed in as Dana, confirmed `/system` access, opened `/system/workspaces`, opened Stark Loss workspace detail, reset Steve Reardon password, signed in as Steve with the one-time temporary password, confirmed Steve is redirected away from `/system` and only sees Stark Loss data, then signed back in as Dana and confirmed Harbor Public Adjusting data remains separate.

## Known Notes

- npm reported moderate dependency audit findings during package installation. These are dependency-tree audit items and were not force-upgraded during scaffold work.

## Next Recommended Slice

- Add a small signed-in password rotation screen (current password + new password) so users can rotate temporary passwords immediately without CLI access.