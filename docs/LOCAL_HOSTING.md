# Local Hosting

For a persistent local production runtime that survives VS Code/debugger/terminal sessions, see `docs/LOCAL_PRODUCTION.md`.

This guide sets up AdjusterDesk as a local demo or staging server on the main Windows computer in the office. The goal is a stable local host with:

- a persistent SQLite database
- persistent uploaded files
- a real `AUTH_SECRET`
- a repeatable build and start process
- simple backup and restore steps

This guide is for the debugger/development profile. For the public local demo/runtime profile, see `docs/LOCAL_PRODUCTION.md`.

For domain/email configuration (IONOS + GoDaddy + Resend), see `docs/EMAIL_SETUP.md`.

## Local Runtime Layout

- App code: the AdjusterDesk repo folder, for example `C:\Projects\adjusterdesk`
- SQLite database: `prisma/dev.db`
- SQLite sidecar files when SQLite is active: `prisma/dev.db-wal`, `prisma/dev.db-shm`, `prisma/dev.db-journal`
- Uploaded files: `storage/uploads-development`
- Environment file: `.env.development.local`

The code currently uses:

- `DATABASE_URL` from `.env.development.local`, falling back to `file:./prisma/dev.db`
- uploads saved under `storage/uploads-development`
- `AUTH_SECRET` for signed sessions

## Recommended Node Version

Use Node 24 LTS on the local demo computer.

Check the installed version:

```powershell
node -v
```

## First-Time Setup

1. Open PowerShell in `C:\Projects\adjusterdesk`.
2. Copy the development example env file.

```powershell
Copy-Item .env.development.example .env.development.local
```

3. Edit `.env.development.local` and set a real `AUTH_SECRET`.
4. Keep `APP_BASE_URL` as `http://localhost:3000` for local hosting.
5. If configuring transactional email later, set email env vars in `.env.development.local` only (do not commit keys).

Example `.env` values:

```dotenv
APP_ENV=development
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
APP_BASE_URL=http://localhost:3000
UPLOADS_DIR=storage/uploads-development
EMAIL_PROVIDER=resend
RESEND_API_KEY=
SYSTEM_EMAIL_FROM="AdjusterDesk <hello@adjusterdesk.xyz>"
SYSTEM_EMAIL_REPLY_TO=hello@adjusterdesk.xyz
PASSWORD_RESET_TOKEN_MINUTES=30
USER_INVITATION_TOKEN_MINUTES=4320
SYSTEM_ADMIN_EMAIL=admin@adjusterdesk.xyz
NEXT_PUBLIC_APP_NAME="AdjusterDesk"
```

6. Install dependencies.

```powershell
npm install
```

7. Generate the Prisma client.

```powershell
npm run prisma:generate
```

8. For a fresh demo database, seed the demo office.

```powershell
npm run db:seed
```

Important: `npm run db:seed` resets the local demo data before re-creating it.

## Demo Reset

Use this only when you want to reset the app back to the seeded Harbor Public Adjusting story.

Safe reset command (requires explicit confirmation and creates a backup by default):

```powershell
npm run demo:reset:local -- -ConfirmReset
```

This wrapper:

- warns that reset is destructive and only for demo/training data
- runs `npm run backup:local` before reset unless you pass `-SkipBackup`
- runs `npm run db:seed` only after confirmation

Direct `npm run db:seed` is still available, but it should be treated as a destructive command.

Important: Do not run demo reset on real pilot office data.

That recreates:

- one new lead ready to convert
- one converted lead
- several active claims
- overdue and due-today work
- an upcoming deadline
- unpaid receivables

## Build For Local Hosting

Build the production app before hosting it locally:

```powershell
npm run prisma:generate
npm run build
```

## Start The Local Server

Use the guarded development alias:

```powershell
npm run dev:local
```

This starts the app on `127.0.0.1:3000` with the development profile loaded from `.env.development.local`.

Typical URLs:

- Local machine: `http://localhost:3000`

If you need LAN access for a debugger session, temporarily override the `-BindHost` parameter.

To find the LAN IP on Windows:

```powershell
ipconfig
```

Use the IPv4 address for the active network adapter.

Notes:

- Windows Firewall may prompt the first time the server is shared on the network.
- Other computers on the LAN must be on the same network and allowed through the local firewall.

## Set AUTH_SECRET Permanently In PowerShell / Windows

If you want the demo computer to keep the same session-signing secret across restarts, save it as a user environment variable.

In PowerShell:

```powershell
[Environment]::SetEnvironmentVariable("AUTH_SECRET", "replace-with-a-long-random-secret", "User")
```

Then close and reopen PowerShell.

Check the stored value exists:

```powershell
[Environment]::GetEnvironmentVariable("AUTH_SECRET", "User")
```

Even if you store it at the user level, keep the same value in `.env.development.local` on the demo computer so the runtime stays predictable.

## Where Data Lives

Persistent local data lives here:

- Database: `prisma/dev.db`
- Uploads: `storage/uploads-development`
- Local env settings: `.env.development.local`

If those files and folders stay in place, the local demo host keeps its data between restarts.

If a document record exists in the database but the matching local file is missing from `storage/uploads-development`, the claim documents page now flags it as missing and asks the office to re-upload it.

## Backup

Run the included PowerShell backup script from the repo root:

```powershell
npm run backup:local
```

For the production local demo profile, use `npm run prod:backup:local`.

Or directly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-local.ps1
```

The script creates a timestamped folder under `backups/` and copies:

- `prisma/dev.db`
- any SQLite sidecar files that exist
- `storage/uploads-development`
- `.env.development.local` if present
- `.env` if present

The `.env` backup may contain your real local `AUTH_SECRET`, so treat backups like sensitive local office files.

## Restore From Backup

1. Stop the local AdjusterDesk server.
2. Pick the backup folder you want to restore from under `backups/`.
3. Run the guarded restore command with explicit confirmation:

```powershell
npm run restore:local -- -BackupPath backups\adjusterdesk-YYYYMMDD-HHMMSS -ConfirmRestore
```

Optional: include profile env files from the backup if you intentionally want to restore local environment values on this machine.

```powershell
npm run restore:local -- -BackupPath backups\adjusterdesk-YYYYMMDD-HHMMSS -ConfirmRestore -RestoreEnv
```

4. Rebuild and restart:

```powershell
npm run prisma:generate
npm run build
```

5. Start the server again:

```powershell
npm run start:local
```

If you are restoring onto a new machine, verify that the restored `.env.development.local` still points to `file:./prisma/dev.db`.
Always review restored env files before using them, because they can contain local secrets.

## Local Production Smoke Checklist

Use this after a build, restore, or demo reset:

1. Start the built app with `npm run start:local`.
2. Sign in with a seeded active user.
3. Open `/today`.
4. Open `/leads`.
5. Open one claim overview.
6. Open that claim's `/tasks` page.
7. Open that claim's `/money` page.
8. Open `/money`.
9. Confirm uploaded documents still open and download if you restored from backup.
10. If any claim document shows "Local file missing", re-upload it from that claim's documents page.

## Recommended Local Hosting Routine

For the main demo computer:

1. Keep the repo in a fixed path such as `C:\Projects\adjusterdesk`.
2. Keep the real `AUTH_SECRET` only in `.env` and the Windows user environment.
3. Run `npm run build` after pulling new code.
4. Run `npm run backup:local` before resetting demo data or before larger updates.
5. Use `npm run demo:reset:local -- -ConfirmReset` only when you intentionally want to return to the demo story.
