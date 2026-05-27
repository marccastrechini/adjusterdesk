# AdjusterDesk Operator Demo Script

Use this for a friendly 15-20 minute walkthrough with a public adjuster office.

## Before Demo (3-5 minutes)

1. Optional clean reset when you want a repeatable baseline:

```powershell
npm run demo:reset:local -- -ConfirmReset
```

2. Create a backup checkpoint:

```powershell
npm run backup:local
```

3. Start the app:

```powershell
npm run prisma:generate
npm run build
npm run start:local
```

4. Open `http://localhost:3000/login`.

If port 3000 is in use:

```powershell
npm run start -- --port 3001
```

Use `http://localhost:3001/login` for the demo.

## Demo Walkthrough

1. Sign in as system admin

- Email: `dana@harboradjusting.example`
- Password: `AdjusterDeskDemo123!`

2. Show system admin at a high level

- Open `/system`.
- Explain this is local global admin only (workspaces and users).
- Keep it brief: counts, install status, and workspace management entry point.

3. Continue as workspace user (same signed-in session is fine for demo)

- Open `/today`.
- Show work order priorities: overdue tasks, due today, upcoming deadlines, waiting on carrier/client, and unpaid receivables.

4. Lead intake

- Open `/leads/new`.
- Add a quick sample lead with follow-up date.
- Save and open the lead detail.

5. Convert lead to claim

- Use Convert to claim on the lead detail.
- Add basic carrier/policy/claim info only if useful for the audience.
- Confirm first claim follow-up task is created.

6. Claim overview

- Open `/claims/<claim-id>`.
- Show status, next step, and the "What to work next" shortcuts.

7. Tasks and deadline

- Open `/claims/<claim-id>/tasks`.
- Add one task, then show deadline and next-step update.

8. Documents upload/download

- Open `/claims/<claim-id>/documents`.
- Upload one small file.
- Confirm it appears in the claim file list.
- Click "Open or download file".

9. Client status page

- Open `/claims/<claim-id>/client-status`.
- Update summary/next step and create or copy a client status link.
- Optionally open the public view under `/status/<token>`.

10. Money and receivables

- Open `/money`.
- Show outstanding receivables and recent checks/payments.
- Drill into one claim money page if asked.

11. Account security (self-service password change)

- Open `/settings/account`.
- Explain users can rotate their own password here using current password + new password confirmation.

## After Demo (2 minutes)

1. Backup again:

```powershell
npm run backup:local
```

2. If this was a training-only run, reset to baseline:

```powershell
npm run demo:reset:local -- -ConfirmReset
```

3. If this was a pilot data session, do not reset. Keep backups and continue with normal local hosting routine in `docs/LOCAL_HOSTING.md`.

## Presenter Notes

- Use plain office language: Claim, Follow-up, Deadline, Documents, Check, Fee, Invoice.
- Avoid deep technical details unless asked.
- Favor one full story from intake to receivable over jumping around every screen.
