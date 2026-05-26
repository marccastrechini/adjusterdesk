# Pilot Deployment Checklist

Use this checklist before inviting real pilot firms.

## 1) Environment Variables and Secrets

- Confirm `DATABASE_URL` points to the production database.
- Keep secrets out of Git and local notes.
- Verify all runtime env values exist on the deployment target.

## 2) Database and Prisma

- Run `npm run db:generate` before build/release.
- Apply schema changes before startup (for this app, use the same Prisma workflow used in development).
- Decide if seed/demo data should be loaded for pilot:
  - For internal walkthroughs: seed data can be helpful.
  - For real pilot data: do not load demo seed records.

## 3) File Storage and Uploads

- Current uploads are local filesystem storage only (`storage/uploads`).
- Local disk storage is not durable across many deployment environments.
- Plan external object storage before real customer data.
- Keep upload/download limits and blocked file types enabled.

## 4) Auth and Session Gaps

- Real sign-in is not implemented yet.
- Firm/user session isolation is not implemented yet.
- Do not treat demo-mode scoping as production security.

## 5) Public Status Links

- Status links are token URLs and should be treated as sensitive.
- Rotate or pause links quickly if shared to the wrong recipient.
- Review what claim summary content is shown before pilot release.

## 6) Backups and Restore

- Configure automatic database backups.
- Test restore steps before pilot onboarding.
- Define who can run restores and where backup artifacts are stored.

## 7) Build and Test Gates

- Run `npm run build` before deployment.
- Run `npm run test:smoke` before deployment.
- Keep `npm run lint`, `npm run typecheck`, and `npm run test` green.

## 8) Rollback Plan

- Keep the previous deploy artifact ready.
- If release issues appear, roll back immediately to last known-good build.
- Re-run smoke tests after rollback.

## 9) Environment Status Labels (in-app)

The Settings page shows a compact "Environment status" card with plain-language labels for the current runtime:

| Label | Meaning |
|---|---|
| Demo workspace mode: On | App uses demo firm/user context — not real per-firm auth. |
| Local file storage: On | Uploads go to local disk — not durable in most hosting environments. |
| Real auth: Not configured | No `AUTH_SECRET`, `NEXTAUTH_SECRET`, or `AUTH_TOKEN` env var detected. |
| Real auth: Configured | At least one auth secret env var is present. Does not verify auth is actually wired. |
| Production database: Local SQLite | `DATABASE_URL` is missing or starts with `file:`. |
| Production database: External database | `DATABASE_URL` points to a non-file URL (e.g. postgres://). |
| Public status links: Enabled | Client-facing token URLs are always active in the current build. |

**Important:** Green or "Configured" labels here reflect env var presence only, not actual security. A green-looking local check is not a substitute for real auth, external storage, or production backups.
