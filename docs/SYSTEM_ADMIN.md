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
npm run backup:local
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
3. Create new workspace and owner for a pilot office.
4. Open that workspace detail and verify users.
5. Resend invite if a user did not receive the first onboarding email.
6. Use reset password only when invite onboarding is blocked or for break-glass support.
7. Have users rotate passwords from Settings > Account security (`/settings/account`) after first sign-in.

## Manual Smoke Checklist

1. Sign in as Dana and open `/system`.
2. Confirm workspace and active-user stats render.
3. Open Stark Loss in `/system/workspaces`.
4. Resend Steve Reardon invite in the Stark workspace detail.
5. Open the invite link and set a password.
6. Confirm token reuse fails and Steve can sign in.
7. Confirm Steve only sees Stark Loss data.
8. Sign back in as demo owner and confirm Harbor data is still separate.
