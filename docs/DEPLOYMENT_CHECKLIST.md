# Deployment Checklist

Use this checklist before inviting real customer firms.

## 1) Environment Variables and Secrets

- Confirm `DATABASE_URL` points to the production database.
- Keep secrets out of Git and local notes.
- Verify all runtime env values exist on the deployment target.

## 2) Database and Prisma

- Run `npm run db:generate` before build/release.
- Apply schema changes before startup with `npm run prod:schema:apply -- -ConfirmProductionSchema` for the local production profile.
- This SQLite MVP currently uses guarded `prisma db push`; do not use `prisma migrate deploy` until migration files are introduced.
- Decide if seed/demo data should be loaded for demo:
  - For internal walkthroughs: seed data can be helpful.
  - For real customer data: do not load demo seed records.

## 3) File Storage and Uploads

- Current uploads are local filesystem storage only (`storage/uploads`).
- Local disk storage is not durable across many deployment environments.
- Plan external object storage before real customer data.
- Keep upload/download limits and blocked file types enabled.

## 4) Auth and Session Guardrails

- Seeded email/password sign-in and firm-scoped sessions are active for the MVP.
- Keep `AUTH_SECRET` stable and private before any shared demo use.
- Keep system admin access limited to trusted operators.

## 5) Public Status Links

- Status links are token URLs and should be treated as sensitive.
- Disable or regenerate links quickly if shared to the wrong recipient.
- Review what claim status, next step, requested documents, and office contact details are shown before release.

## 6) Backups and Restore

- Configure automatic database backups.
- Test restore steps before customer onboarding.
- Define who can run restores and where backup artifacts are stored.

## 7) Build and Test Gates

- Run `npm run build` before deployment.
- Run `npm run test:smoke` before deployment.
- Keep `npm run lint`, `npm run typecheck`, and `npm run test` green.
- Run `npm run prod:demo:readiness` after production demo bootstrap or schema changes.

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
| Public status links: Enabled | Client-facing token URLs can be enabled, disabled, and regenerated from the claim client-status tab. |

**Important:** Green or "Configured" labels here reflect env var presence only, not actual security. A green-looking local check is not a substitute for real auth, external storage, or production backups.