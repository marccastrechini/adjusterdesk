# Pilot Readiness Checklist

Use this before showing AdjusterDesk to a friendly pilot office and before allowing real office work in the local install.

## Safe To Demo Now

- Sign-in with office users and firm-scoped sessions.
- Today worklist for follow-ups, deadlines, missing documents, and receivables.
- Lead intake and lead-to-claim conversion.
- Claim workflow tabs: overview, tasks, documents, notes, money, and client status.
- Public client status links with optional client uploads.
- System admin local console for workspace and user operations.
- Self-service password change in `/settings/account`.
- Local backup, restore, and demo reset scripts.

## Not Ready For Sensitive Production Data Yet

- OAuth/SSO, user invites, and full account-recovery flow.
- Advanced role/permission controls beyond current workspace scoping.
- Managed cloud object storage for documents.
- Production-grade database hosting and operations runbooks.
- External integrations (email, calendar, accounting, carrier systems).

## Local Hosting Limitations

- Local Windows host is a single-machine dependency.
- SQLite and local uploads are file-based and tied to this host path.
- Uptime and performance depend on local machine/network conditions.
- Local firewall/network setup may block LAN access if not configured.
- Session security depends on stable `AUTH_SECRET` configuration.

See `docs/LOCAL_HOSTING.md` for exact setup and recovery steps.

## Backup Expectations

- Run `npm run prod:backup:local` before production demos, admin changes, resets, restores, or updates.
- Run `npm run backup:local` before debugger/dev demos or local testing.
- Keep backup folders private because they can include local database files, uploaded files, and `.env`.
- Verify restore flow at least once on a safe non-live copy path.
- Use `npm run demo:reset:local -- -ConfirmReset` only for development/demo datasets.
- Full production demo reset is blocked. Use `npm run prod:demo:bootstrap -- -ConfirmProductionDemo` only for the firm-scoped fake production demo workspace.
- Do not run demo reset once real pilot office data exists in that local database.

## Production Demo Readiness Commands

Apply schema changes to the local production profile with a backup first:

```powershell
npm run prod:schema:apply -- -ConfirmProductionSchema
```

Verify the demo database, seeded users, pilot feedback table, key route files, and public marketing pages:

```powershell
npm run prod:demo:readiness
```

## Suggested Pilot Questions

- Does Today match your real daily claim-follow-up order?
- Which fields are missing from lead intake for your office?
- Does claim overview show enough context without opening every tab?
- Do task/deadline flows reduce missed follow-ups?
- Are document categories and request templates clear for staff?
- Is the client status page clear enough for policyholders?
- Does money/receivables view match how you track fees and checks now?
- What would block your office from using this daily for a 2-4 week pilot?

## Known Warnings And Limitations

- Current build may show a non-fatal Turbopack NFT tracing warning tied to local file-storage route imports.
- Package audit can report moderate dependency findings; none are force-upgraded automatically.
- Local file-missing records can occur after manual file moves/deletes or incomplete restores; documents page flags these and requires re-upload.
- This MVP is an office workflow tracker and does not provide legal advice, coverage determinations, or claim valuation advice.

## Practical Pilot Guardrails

- Keep pilot scope small: one office, a few users, a defined claim subset.
- Schedule backup checkpoints and ownership for restore operations.
- Use system admin access only on trusted local office machines.
- Require users to rotate temporary passwords at first sign-in via `/settings/account`.

## Admin Workspace View For Demo And Support

Operator workflow:

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
- Use demo owner login when showing the true customer experience.
