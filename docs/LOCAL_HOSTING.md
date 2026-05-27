# Local Hosting

This guide sets up AdjusterDesk as a local demo or staging server on the main Windows computer in the office. The goal is a stable local host with:

- a persistent SQLite database
- persistent uploaded files
- a real `AUTH_SECRET`
- a repeatable build and start process
- simple backup and restore steps

## Local Runtime Layout

- App code: the AdjusterDesk repo folder, for example `C:\Projects\adjusterdesk`
- SQLite database: `prisma/dev.db`
- SQLite sidecar files when SQLite is active: `prisma/dev.db-wal`, `prisma/dev.db-shm`, `prisma/dev.db-journal`
- Uploaded files: `storage/uploads`
- Environment file: `.env`

The code currently uses:

- `DATABASE_URL` from `.env`, falling back to `file:./prisma/dev.db`
- uploads saved under `storage/uploads`
- `AUTH_SECRET` for signed sessions

## Recommended Node Version

Use Node 24 LTS on the local demo computer.

Check the installed version:

```powershell
node -v
```

## First-Time Setup

1. Open PowerShell in `C:\Projects\adjusterdesk`.
2. Copy the example env file.

```powershell
Copy-Item .env.example .env
```

3. Edit `.env` and set a real `AUTH_SECRET`.

Example `.env` values:

```dotenv
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_NAME="AdjusterDesk"
```

4. Install dependencies.

```powershell
npm install
```

5. Generate the Prisma client.

```powershell
npm run prisma:generate
```

6. For a fresh demo database, seed the demo office.

```powershell
npm run db:seed
```

Important: `npm run db:seed` resets the local demo data before re-creating it.

## Demo Reset

Use this only when you want to reset the app back to the seeded Harbor Public Adjusting story.

```powershell
npm run db:seed
```

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

Use the LAN-friendly alias:

```powershell
npm run start:local
```

This starts the built app on `0.0.0.0:3000`.

Typical URLs:

- Local machine: `http://localhost:3000`
- Same network: `http://<demo-computer-ip>:3000`

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

Even if you store it at the user level, keep the same value in `.env` on the demo computer so the runtime stays predictable.

## Where Data Lives

Persistent local data lives here:

- Database: `prisma/dev.db`
- Uploads: `storage/uploads`
- Local env settings: `.env`

If those files and folders stay in place, the local demo host keeps its data between restarts.

## Backup

Run the included PowerShell backup script from the repo root:

```powershell
npm run backup:local
```

Or directly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-local.ps1
```

The script creates a timestamped folder under `backups/` and copies:

- `prisma/dev.db`
- any SQLite sidecar files that exist
- `storage/uploads`
- `.env` if present

The `.env` backup may contain your real local `AUTH_SECRET`, so treat backups like sensitive local office files.

## Restore From Backup

1. Stop the local AdjusterDesk server.
2. Pick the backup folder you want to restore from.
3. Copy the backed-up database files into `prisma/`.
4. Copy the backed-up `uploads/` contents into `storage/uploads`.
5. If the backup includes `.env`, restore it only if you want to restore that machine's local settings and `AUTH_SECRET`.
6. Run:

```powershell
npm run prisma:generate
npm run build
```

7. Start the server again:

```powershell
npm run start:local
```

If you are restoring onto a new machine, verify that the restored `.env` still points to `file:./prisma/dev.db`.

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

## Recommended Local Hosting Routine

For the main demo computer:

1. Keep the repo in a fixed path such as `C:\Projects\adjusterdesk`.
2. Keep the real `AUTH_SECRET` only in `.env` and the Windows user environment.
3. Run `npm run build` after pulling new code.
4. Run `npm run backup:local` before resetting demo data or before larger updates.
5. Use `npm run db:seed` only when you intentionally want to return to the demo story.
