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

- Run `npm run backup:local` before demos, admin changes, resets, restores, or updates.
- Keep backup folders private because they can include local database files, uploaded files, and `.env`.
- Verify restore flow at least once on a safe non-live copy path.
- Use `npm run demo:reset:local -- -ConfirmReset` only for demo/training datasets.
- Do not run demo reset once real pilot office data exists in that local database.

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
