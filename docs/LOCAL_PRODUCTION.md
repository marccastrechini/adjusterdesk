# Local Production Runtime

This runbook sets up AdjusterDesk to run locally in production mode on the main demo machine, independent of VS Code, debugger sessions, or ad hoc terminals.

Scope for this setup:

- Local machine runtime only
- Next.js production server on `127.0.0.1:3000`
- Cloudflare Tunnel forwarding to `http://127.0.0.1:3000`
- Public app URL `https://adjusterdesk.xyz`

## Required Environment Values

Set these in local `.env.production.local` on the main demo machine.

Copy the example template first:

```powershell
Copy-Item .env.production.example .env.production.local
```

```dotenv
APP_ENV=production
APP_BASE_URL=https://adjusterdesk.xyz
SELF_SERVICE_SIGNUP_ENABLED=true
DATABASE_URL=file:./prisma/production.db
UPLOADS_DIR=storage/uploads-production
AUTH_SECRET=replace-with-a-long-random-secret
EMAIL_PROVIDER=resend
RESEND_API_KEY=
SYSTEM_EMAIL_FROM="AdjusterDesk <hello@adjusterdesk.xyz>"
SYSTEM_EMAIL_REPLY_TO=hello@adjusterdesk.xyz
PASSWORD_RESET_TOKEN_MINUTES=30
USER_INVITATION_TOKEN_MINUTES=4320
SYSTEM_ADMIN_EMAIL=admin@adjusterdesk.xyz
NEXT_PUBLIC_APP_NAME="AdjusterDesk"
```

Production standard: keep `SELF_SERVICE_SIGNUP_ENABLED=true`.
Use `SELF_SERVICE_SIGNUP_ENABLED=false` only as a temporary public-signup close switch.

Keep existing secure values for `.env.production.local` only. Do not commit `.env`, `.env.production.local`, or any secret values.

## Run Directly

If you want to start the built app without Task Scheduler, run:

```powershell
npm run prod:run:local
```

The runtime now always writes an appended transcript log to:

- `logs/local-production-live.log`

## Deploy Or Update Local Production

From `C:\Projects\adjusterdesk`:

```powershell
npm run prod:deploy:local
```

This script runs:

1. working tree status check
2. `git pull --ff-only`
3. `npm install --include=dev`
4. `npm run prod:schema:apply -- -ConfirmProductionSchema`
5. `npm run build`

`prod:schema:apply` creates a production backup before applying the Prisma schema with `db push`. This SQLite MVP does not have Prisma migration files yet, so `prisma migrate deploy` is not the correct command for this app today.

After deploy/update, restart the runtime task:

```powershell
npm run prod:task:stop -- -ConfirmStop
npm run prod:task:start
```

## Install The Scheduled Task

Install/update the local production task (requires explicit confirmation):

```powershell
npm run prod:task:install -- -ConfirmInstall
```

Task details:

- Task name: `AdjusterDeskLocalProduction`
- Trigger: user logon
- Action: run [scripts/run-local-production.ps1](../scripts/run-local-production.ps1)
- Runtime bind: `127.0.0.1:3000`
- Always-on runtime log: `logs/local-production-live.log`

## Start, Stop, And Check Status

Start:

```powershell
npm run prod:task:start
```

Stop task only:

```powershell
npm run prod:task:stop
```

Stop task and explicitly stop any process listening on port 3000:

```powershell
npm run prod:task:stop -- -ConfirmStop
```

Status:

```powershell
npm run prod:task:status
```

## Confirm Port 3000 Is Listening

Use either method:

```powershell
npm run prod:task:status
```

or

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

## Daily Commands

Use these exact commands from C:\Projects\adjusterdesk.

Deploy or update production build:

```powershell
npm run prod:deploy:local
```

Install or update the scheduled task:

```powershell
npm run prod:task:install -- -ConfirmInstall
```

Start scheduled production runtime:

```powershell
npm run prod:task:start
```

Stop scheduled runtime and explicitly stop node listener on port 3000:

```powershell
npm run prod:task:stop -- -ConfirmStop
```

Check scheduled task, listener, and local/public URL health:

```powershell
npm run prod:task:status
```

Run the production demo readiness check after a schema or demo-data change:

```powershell
npm run prod:demo:readiness
```

Back up production database and uploads:

```powershell
npm run prod:backup:local
```

For the fixed production demo workspace and shared owner login, see [docs/PRODUCTION_DEMO_BOOTSTRAP.md](PRODUCTION_DEMO_BOOTSTRAP.md).

Run `npm run prod:demo:bootstrap -- -ConfirmProductionDemo` only after setting `DEMO_OWNER_PASSWORD` at runtime or passing `--password` on the command line.

The bootstrap creates or refreshes fake demo data only, requires a fresh production backup first, verifies that `admin@adjusterdesk.xyz` still remains system admin without changing that account, and refuses to run by default if the production database contains non-demo customer workspaces.

Confirm the public tunnel URL is serving the app:

```powershell
Invoke-WebRequest https://adjusterdesk.xyz/system -UseBasicParsing
```

Confirm database, demo users, feedback, route files, and public pages:

```powershell
npm run prod:demo:readiness
```

## Cloudflare Tunnel Target

Cloudflare Tunnel should target exactly:

- `http://127.0.0.1:3000`

Do not expose `0.0.0.0:3000` directly for this production local runtime.

## Verify Runtime And Public URL

1. Confirm local runtime:
- `http://127.0.0.1:3000`
- `http://localhost:3000`

2. Confirm app routes after sign-in:
- `/system`

3. If tunnel is active, confirm:
- `https://adjusterdesk.xyz`

4. Confirm links generated by app email flows use `https://adjusterdesk.xyz` when `APP_BASE_URL` is set:
- `/forgot-password` email links
- invite acceptance links to `/accept-invite`

## Troubleshooting

### 404 at root or routes

- Build may be stale or missing.
- Run:

```powershell
npm run prod:deploy:local
npm run prod:task:stop -- -ConfirmStop
npm run prod:task:start
```

### Stale build after update

- Runtime is still serving an older process.
- Stop with explicit port-process confirmation, then start again.

### Port conflict on 3000

- Another process is listening on 3000.
- Run:

```powershell
npm run prod:task:stop -- -ConfirmStop
npm run prod:task:start
```

### Task is installed but not running

- Check:

```powershell
npm run prod:task:status
```

- Start manually:

```powershell
npm run prod:task:start
```

### Scheduled task install returns Access denied

- Re-run the install from an elevated PowerShell session on the demo machine.
- Confirm the account has permission to create local scheduled tasks.
- Retry:

```powershell
npm run prod:task:install -- -ConfirmInstall
```

### Cloudflare URL not loading

- Confirm local runtime is active on `127.0.0.1:3000`.
- Confirm tunnel is active and points to `http://127.0.0.1:3000`.
- Confirm DNS for `adjusterdesk.xyz` is already mapped to the active tunnel.

## Backup Before Demos

Always back up before live demos or updates:

```powershell
npm run prod:backup:local
```

Use full deploy/update flow when possible because it already includes backup as the final step.
