# AdjusterDesk Production Demo Script

Use this script for a confident walkthrough of the production demo workspace at https://adjusterdesk.xyz.

Core positioning:

- Simple workspace for small public adjusting offices.
- Reduce mental load.
- Know what to work next.
- Keep claims, documents, follow-ups, money, and communications together.

## Pre-Demo Checklist (2-3 minutes)

1. Confirm production task is running.
2. Confirm production demo bootstrap completed.
3. Confirm demo owner login is available.
4. Confirm public URL is healthy.

Recommended checks:

```powershell
npm run prod:task:status
$env:DEMO_OWNER_PASSWORD = "AdjusterDeskDemo123!"
npm run prod:demo:bootstrap -- -ConfirmProductionDemo
```

Sign in at https://adjusterdesk.xyz/login with:

- Email: demo.owner@adjusterdesk.xyz
- Password: runtime demo password used for bootstrap

## Admin Workspace View

Use this when you need to inspect or support the demo office quickly without changing to the demo owner account.

1. Sign in as system admin.
2. Open `/system/workspaces`.
3. Click `Enter workspace` for `AdjusterDesk Demo Office`.
4. Confirm banner: `Viewing AdjusterDesk Demo Office as system admin.`
5. Use Today, Leads, Claims, and Money as normal.
6. Click `Exit workspace view` to return to `/system/workspaces`.

Safety notes:

- This is not silent impersonation.
- The system admin identity remains visible in the app shell while in workspace view.
- Non-admin users cannot access system workspace switching.

Demo-use notes:

- Use admin workspace view when you need a quick support or pre-demo check without logging out and back in as demo owner.
- Use demo owner login when you want to show the true customer experience end to end.

## Story You Are Showing

The seeded production demo tells one small-office story from intake to money collection:

- Leads needing follow-up now (including due and overdue)
- Claim work with overdue and due-today tasks
- Waiting-on-client claim with requested and received documents
- Waiting-on-carrier claim with clear follow-up action
- Settlement and fee collection story with outstanding and partially paid invoices
- Communication notes and starter templates for faster follow-up

## 5-Minute Path (Fast Executive View)

Use this when time is tight.

1. Today page
- Open Today.
- Click one Start here action.
- Show row-level actions for leads, tasks, documents, and carrier follow-up.

What to say:

- This page is the office work order for today.
- The team can see what to touch first without hunting across tabs.
- Use suggested next steps to add common follow-ups fast.
- Request client documents and mark them received.
- Open the activity timeline to see the claim history in one place.
- Open Reports to see open claims, overdue work, settlements, and unpaid invoices.

Do not dwell on:

- Detailed filter combinations.
- Every summary card.

2. Leads list and one lead detail
- Open Leads.
- Show Open lead, Log note or call, Add follow-up task, and Convert/Open converted claim actions.
- Open one lead and point to compact lead action panel.

What to say:

- Leads stay simple: capture, follow up, and convert when ready.
- Action buttons make the next step obvious.

Do not dwell on:

- Editing many lead fields.
- Any custom workflow language.

3. Claims and Money
- Open Claims and show waiting-on-client and waiting-on-carrier examples.
- Open Money and show outstanding receivables plus partial payment story.

What to say:

- Claims, docs, follow-ups, and money stay tied to one file.
- You can see what is still open and what got paid.

Do not dwell on:

- Accounting edge cases.
- Any roadmap features.

## 12-Minute Path (Full Office Story)

Use this as the standard pilot walkthrough.

1. Today: work order and first actions
- Open Today.
- Point out: lead follow-ups due, overdue/due-today tasks, requested client documents, waiting on carrier, and unpaid receivables.
- Click one lead action and one claim action from rows.

What to say:

- This is the daily control panel for a small PA office.
- It helps the team decide what to work next in the right order.

Do not dwell on:

- Every anchor link.
- Internal scoring logic.

2. Leads list: intake to conversion
- Open Leads.
- Show one new lead with due/overdue follow-up.
- Show one converted lead with Open converted claim.
- Use row actions to open a lead detail.

What to say:

- Intake and follow-up are visible from one list.
- Converting to claim is a clear handoff, not a separate system.

Do not dwell on:

- Large spreadsheet cleanup.
- Long lead history cleanup.

3. Lead detail actions
- On lead detail, use compact actions (log note/call, add task, convert if applicable).
- Show that actions open directly without modal-heavy steps.

What to say:

- The page keeps actions close to the core lead facts.
- Staff can log touches quickly and keep momentum.

Do not dwell on:

- Rare lead statuses.
- Non-demo data entry branches.

4. Claims list: current office workload
- Open Claims.
- Point to one waiting-on-client claim with missing docs context.
- Point to one waiting-on-carrier claim with next-step follow-up.
- Point to one active claim with open tasks and money signal.

What to say:

- Each row answers: what is this claim and what do I do next?
- The list supports quick triage without opening every file first.

Do not dwell on:

- Advanced reporting.
- Deep status taxonomy debates.

5. Claim detail tabs: tasks, documents, communications
- Open one claim.
- Tasks tab: show due work and complete/reopen flow.
- Documents tab: show requested-from-client and received records with notes about what is still missing.
- Communications tab: show realistic call/email/text history and starter-template language in activity.

What to say:

- This keeps file movement visible: tasks, docs, and communication in one claim workspace.
- Notes explain what is missing versus what already came in.

Do not dwell on:

- Upload implementation details.
- Any legal/coverage interpretation.

6. Money: settlement to fee collection
- Open Money list.
- Show outstanding invoice.
- Show partial payment example.
- Open claim money page from row actions.

What to say:

- The office can track what was billed, what was paid, and what is still open.
- Settlement checks and fee collections are visible in one place.

Do not dwell on:

- Full bookkeeping replacement claims.
- Complex accounting workflows.

7. Client status (close)
- Open claim client-status tab.
- Show plain-language client-facing progress summary.
- Send a client a simple claim status link.
- Point out that the public page leaves out internal notes, tasks, money, invoices, and private files.

What to say:

- This helps keep policyholders informed without a client portal or separate manual updates.
- The office can keep updates clear and consistent.

Do not dwell on:

- Public-link edge-case security discussion.
- Deep admin operations.

## Presenter Guardrails

- Use plain office words: claim, follow-up, deadline, documents, settlement, check, fee, invoice.
- Keep promises realistic: this is an MVP office workspace, not enterprise software.
- Do not frame as legal advice, coverage decisions, or claim valuation automation.
- Favor one connected story over feature-hopping.
