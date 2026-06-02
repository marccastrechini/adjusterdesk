# Production Demo Bootstrap

Use this guide to create or refresh the fixed demo workspace in the local production profile for the public demo site at [https://adjusterdesk.xyz](https://adjusterdesk.xyz).

This bootstrap is for fake demo data only. Do not point it at real customer claims, real customers, or real uploaded documents.

## What The Demo Workspace Is

The bootstrap maintains one shared production demo workspace:

- Workspace name: `AdjusterDesk Demo Office`
- Demo owner login: `demo.owner@adjusterdesk.xyz`

The workspace is meant for repeated demos and rehearsals. It can be refreshed safely without creating duplicate demo records.

## Before You Run It

Create a production backup first:

```powershell
npm run prod:backup:local
```

The bootstrap also creates a fresh backup before it changes data, but the manual backup is still the safest habit before a live demo day.

## How To Run It

The script refuses to run unless all of these are true:

- `APP_ENV=production`
- `APP_BASE_URL=https://adjusterdesk.xyz`
- `DATABASE_URL` points to `prisma/production.db`
- You pass `-ConfirmProductionDemo`
- The database contains only the demo workspace and system-admin-only support workspaces, unless you explicitly set the mixed-database override described below

Run it like this:

```powershell
$env:DEMO_OWNER_PASSWORD = "Use-A-Strong-Local-Only-Password"
npm run prod:demo:bootstrap -- -ConfirmProductionDemo
```

You can also pass the password on the command line:

```powershell
npm run prod:demo:bootstrap -- -ConfirmProductionDemo --password "Use-A-Strong-Local-Only-Password"
```

The script never prints the full password.

If a future production database contains real customer workspaces, the bootstrap refuses to run by default. The only override is:

```powershell
$env:ALLOW_PRODUCTION_DEMO_BOOTSTRAP_WITH_OTHER_FIRMS = "I_UNDERSTAND_THIS_DATABASE_HAS_NON_DEMO_WORKSPACES"
```

Set that only after confirming the bootstrap is still appropriate. The script only refreshes the `AdjusterDesk Demo Office` workspace, but this guard keeps demo operations from becoming a casual habit on mixed data.

After bootstrapping, verify the demo:

```powershell
npm run prod:demo:readiness
```

## Why The Demo Owner Is Not A System Admin

`demo.owner@adjusterdesk.xyz` is a normal workspace `OWNER`, not a system admin.

That separation matters because:

- workspace owners can run the office day-to-day
- system admin access stays reserved for `admin@adjusterdesk.xyz`
- demo sign-ins should not expose the global `/system` console

The bootstrap verifies that `admin@adjusterdesk.xyz` is still marked as system admin, but it does not modify that account.

## How To Log In

After the bootstrap finishes, sign in at [https://adjusterdesk.xyz/login](https://adjusterdesk.xyz/login) with:

- Email: `demo.owner@adjusterdesk.xyz`
- Password: the runtime password you supplied

The owner should land in `AdjusterDesk Demo Office`.

## Admin Workspace View

Use this mode when you need to check or support the demo workspace quickly without switching to the demo owner account.

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

- Use admin workspace view for quick demo-office checks without logging out/in as demo owner.
- Use demo owner login when presenting the true customer experience.

## How To Back Up Before And After

Before:

```powershell
npm run prod:backup:local
```

After the demo session, create another backup so you keep the final production state:

```powershell
npm run prod:backup:local
```

If you need to refresh the demo workspace again later, back up first and run the bootstrap again with a new runtime password.

## How To Rotate The Demo Password

Rotate the password by re-running the bootstrap with a new runtime password value:

```powershell
$env:DEMO_OWNER_PASSWORD = "A-New-Local-Only-Password"
npm run prod:demo:bootstrap -- -ConfirmProductionDemo
```

That updates the shared owner login without changing the workspace name or recreating the demo story in a different shape.

If the owner is already signed in, you can also change the password from [Settings > Account](https://adjusterdesk.xyz/settings/account) after logging in, but the bootstrap is the safest shared-password rotation path for the production demo login.

## Warning

Fake data only.

Never point this bootstrap at a live customer office database, real policyholder data, real uploads, or production secrets that should stay private.