# System Admin

This guide is for Marc's local-only global admin console.

Use the system admin area to manage workspaces and users across the local AdjusterDesk install.

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
3. Share temporary passwords securely and rotate after first sign-in.
4. Do not commit local database files, uploaded files, `.env`, generated passwords, or backups.

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
- update owner/user email
- reset user password (generated temporary password shown once)
- deactivate/reactivate workspace users

## Recommended Local Flow

1. Sign in as system admin.
2. Open `/system/workspaces`.
3. Create new workspace and owner for a pilot office.
4. Open that workspace detail and verify users.
5. If needed, reset a user password and securely hand off the one-time temporary password.
6. Have that user sign in and immediately rotate their password from Settings > Account security (`/settings/account`).

## Manual Smoke Checklist

1. Sign in as Dana and open `/system`.
2. Confirm workspace and active-user stats render.
3. Open Stark Loss in `/system/workspaces`.
4. Reset Steve Reardon password in the Stark workspace detail.
5. Sign in as Steve using the temporary password.
6. Confirm Steve only sees Stark Loss data.
7. Sign back in as demo owner and confirm Harbor data is still separate.
