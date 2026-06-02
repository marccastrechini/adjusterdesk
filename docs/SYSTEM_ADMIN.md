# System Admin

This guide is for Marc's local-only global admin console.

Use the system admin area to manage workspaces and users across the local AdjusterDesk install.

For domain/email configuration (IONOS + GoDaddy + Resend), see `docs/EMAIL_SETUP.md`.

- System dashboard: `/system`
- Workspaces list: `/system/workspaces`
- Workspace detail: `/system/workspaces/<workspace-id>`

This area is separate from normal office owner/admin tools in `/settings`.

## Safety First

1. Back up local data before global admin changes.

```powershell
npm run prod:backup:local
```

2. Use system admin access only on trusted local office computers.
3. Prefer invite emails so users set their own password through one-time links.
4. Use temporary passwords only as break-glass support.
5. Do not commit local database files, uploaded files, `.env`, generated passwords, or backups.

## Who Can Access `/system`

Only users with `isSystemAdmin = true` can open system admin routes.

Normal workspace owners without `isSystemAdmin` are redirected to `/today`.

The seeded demo owner Dana (`dana@harboradjusting.example`) is flagged as a system admin after `npm run db:seed`.

## What You Can Do In `/system`

1. View global admin dashboard status:
- workspace count
- active user count
- local install status

2. View all workspaces:
- workspace name
- owner user/email
- user count
- lead count
- claim count
- created date

3. Open each workspace detail:
- workspace info
- owner user
- users in workspace
- lead/claim counts

4. Run global user admin actions:
- create workspace with owner user
- send owner/user invitation links
- update owner/user email
- reset user password (generated temporary password shown once)
- deactivate/reactivate workspace users

## Recommended Local Flow

1. Sign in as system admin.
2. Open `/system/workspaces`.
3. Create new workspace and owner for a customer office.
4. Open that workspace detail and verify users.
5. Resend invite if a user did not receive the first onboarding email.
6. Use reset password only when invite onboarding is blocked or for break-glass support.
7. Have users rotate passwords from Settings > Account security (`/settings/account`) after first sign-in.

## Admin Workspace View

Use this when support or demo prep requires checking an office workspace quickly from system admin.

1. Sign in as system admin.
2. Open `/system/workspaces`.
3. Click `Enter workspace` for `AdjusterDesk Demo Office`.
4. Confirm banner: `Viewing AdjusterDesk Demo Office as system admin.`
5. Use Today, Leads, Claims, and Money as normal.
6. Click `Exit workspace view` to return to `/system/workspaces`.

Safety notes:

- This is not silent impersonation.
- The system admin identity remains visible while workspace view is active.
- Non-admin users cannot access system workspace switching.

Demo-use notes:

- Use admin workspace view for quick support checks of the demo office without logging out/in as demo owner.
- Use demo owner login when demonstrating the true customer experience.

If you are working in the debugger/dev profile instead of the production demo profile, use `npm run backup:local` instead.

## Manual Smoke Checklist

1. Sign in as system admin and open `/system`.
2. Confirm workspace and active-user stats render.
3. Open `/system/workspaces` and enter `AdjusterDesk Demo Office`.
4. Confirm the admin workspace-view banner is visible.
5. Open Today, Leads, Claims, and Money to confirm expected demo data.
6. Click `Exit workspace view` and confirm return to `/system/workspaces`.
7. Sign in as demo owner and confirm `/system` is blocked.
