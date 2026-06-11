# AdjusterDesk Production UX Study Report

Study date: 2026-06-11  
Production site: https://adjusterdesk.xyz  
Evidence artifacts: `artifacts/ux-study/2026-06-11-1612/`  
Harness: `npm run ux:study:prod`

## 1. Executive Summary

Overall UX readiness: **Good MVP readiness with two P1 outreach risks**.

AdjusterDesk largely meets the goal of feeling simple, natural, practical, and real for somewhat technically oriented solo to 5-person public adjusting offices. The strongest areas are public positioning, lead intake, claim intake, claim detail navigation, document/task workflows, client status sharing, and permission separation.

Overall score: **3.85 / 5**  
Task average: **3.92 / 5**

The product feels like an operational SaaS rather than a pilot, demo, or unfinished internal tool. Public copy avoids flagged pilot/beta/demo/test language, and the logged-in normal user experience does not expose demo reset, seed/reset, or system-admin controls.

Biggest risks:

1. **Money workflow density**: settlement, fee, invoice, payment, and receivable concepts are implemented but denser than leads/claims/tasks. This is the highest UX risk before serious outreach.
2. **First-use Today value**: Today is useful after the workspace has tasks/deadlines/receivables, but sparse workspaces need clearer first-use guidance so a new office sees what to do next.
3. **Accessibility polish**: representative axe scans found color contrast issues and one landmark issue. These are not P0 blockers for first conversations, but they matter before broader launch.

## 2. Scorecard

### Dimension Scores

| Dimension | Score | Interpretation |
|---|---:|---|
| First-glance clarity | 4 | Main pages communicate their purpose quickly. |
| Next-step clarity | 4 | Most pages expose a clear next action. |
| Match with public-adjusting office language | 5 | Claims, clients, carriers, documents, deadlines, fees, invoices, and checks match office language. |
| Navigation confidence | 4 | Sidebar and claim tabs are predictable. |
| Cognitive load | 3 | Money and admin areas are denser than the rest. |
| Error prevention | 4 | Required fields, hints, and validation help prevent bad saves. |
| Error recovery | 4 | Validation messages are plain and actionable. |
| Recognition over recall | 4 | Templates and suggested next steps reduce blank-page friction. |
| Empty-state usefulness | 4 | Most empty states point to useful actions. |
| Accessibility/keyboard basics | 3 | Keyboard nav works; axe found contrast and landmark issues. |
| Mobile/responsive basics | 3 | Public mobile is usable; operational workflows are desktop/tablet-oriented. |
| MVP alignment | 4 | Core MVP workflows are implemented and usable. |
| Trust/professional confidence | 4 | Public and logged-in surfaces feel credible and current. |

### Task Scores

| Task | Route | Score | Evidence |
|---|---|---:|---|
| First login / orientation | `/today` | 4 | `09-a-first-login-today.png` |
| Start the day | `/today` | 4 | `09-a-first-login-today.png` |
| New lead intake | `/leads/new` | 4 | `11-lead-validation.png` |
| New claim intake | `/claims/new` | 4 | `13-claim-validation.png` |
| Claim work | `/claims/[id]` | 4 | `14-claim-overview.png` |
| Client status/share flow | `/claims/[id]/client-status` | 4 | `19-client-status-configured.png` |
| Tasks/follow-up | `/claims/[id]/tasks` | 4 | `21-task-created.png` |
| Documents | `/claims/[id]/documents` | 4 | `23-document-uploaded.png` |
| Money/reports | `/money`, `/reports` | 3 | `24-money-receivables.png` |
| Settings | `/settings` | 4 | `26-settings.png` |
| Permission check | `/system` as normal user | 5 | `27-normal-user-system-blocked.png` |
| Admin UX check | `/system` | 3 | `28-admin-system-dashboard.png` |

## 3. MVP Traceability Summary

See `docs/research/MVP_TRACEABILITY_MATRIX.md` for the full matrix.

Counts:

- Pass: 9
- Partial: 5
- Fail: 0
- Not tested: 2

Feature gaps:

- No P0 missing MVP areas were found.
- Lead-to-claim conversion and CSV import were not rerun in the UX harness, but existing smoke tests cover them.

UX gaps:

- Money workflow needs guided first-use help.
- Today needs stronger guidance in sparse or brand-new workspaces.
- Accessibility contrast and landmark issues need a focused polish pass.

Out-of-scope items correctly not expected:

- Legal advice
- Automated claim valuation
- Coverage determination
- Carrier integrations
- QuickBooks sync
- Email/SMS workflow automation beyond current account/invite/reset flows
- Advanced permissions beyond the current owner/adjuster/system-admin model

## 4. Prioritized Findings

### UX-001 - P1 - Money workflows are denser than the rest of the app

Route: `/money`, `/claims/[id]/money`  
Task: Money/reports  
Evidence: `artifacts/ux-study/2026-06-11-1612/24-money-receivables.png`

What happened: Money workflows are functional but denser than the rest of the app, with settlement, fee, invoice, and payment concepts competing for attention.

Why it matters: Small offices may understand the terms, but first-time users could hesitate before recording the first fee invoice or payment.

MVP goal impacted: Track settlements, fees, invoices, payments, and receivables.

Recommended fix: Add a short guided first-money empty state or step-by-step helper: record settlement, create fee invoice, record check/payment.

Timing: **Before serious outreach**.

### UX-002 - P1 - Today is strongest after data exists

Route: `/today`  
Task: First login / start the day  
Evidence: `artifacts/ux-study/2026-06-11-1612/09-a-first-login-today.png`

What happened: A new or sparse QA workspace has less immediate priority signal; Today is strongest after tasks, deadlines, and receivables exist.

Why it matters: A prospect landing in a fresh workspace may not immediately see the full daily value without sample or guided next action context.

MVP goal impacted: Show Today with overdue tasks, due today, upcoming deadlines, carrier follow-ups, receivables, and recent claims.

Recommended fix: Add a first-office mode that points users to create/import leads or claims and explains what will appear on Today after work exists.

Timing: **Before serious outreach**.

### UX-003 - P2 - Admin workspace tools are powerful and dense

Route: `/system/workspaces`  
Task: Admin UX check  
Evidence: `artifacts/ux-study/2026-06-11-1612/29-admin-workspaces.png`

What happened: System admin provisioning tools are intentionally powerful and dense.

Why it matters: Internal operators can use them, but mistakes could affect workspaces if used carelessly.

MVP goal impacted: Admin/system tools stay gated and operationally safe.

Recommended fix: Add concise helper copy and confirmations around temporary password/bootstrap choices after first public conversations.

Timing: After first conversations.

### UX-004 - P2 - Mobile is stronger for reading than heavy data entry

Route: Mobile app shell  
Task: Mobile/responsive basics  
Evidence: `artifacts/ux-study/2026-06-11-1612/08-mobile-public-homepage.png`

What happened: Mobile public pages are usable; logged-in operational workflows remain better suited to desktop/tablet due to dense forms and tables.

Why it matters: Small offices may check status on phones, but heavy intake and money entry are likely desktop tasks.

MVP goal impacted: Simple practical workflow for small offices.

Recommended fix: Prioritize mobile read/review flows first; do not over-invest in mobile data entry until user conversations confirm need.

Timing: After first conversations.

### UX-005 - P2 - Accessibility contrast and landmark issues

Route: `/today`, `/leads/new`, `/claims/[id]`, `/system/workspaces`  
Task: Accessibility/keyboard basics  
Evidence: `artifacts/ux-study/2026-06-11-1612/today-dashboard-axe.json`

What happened: Representative axe scans found serious color-contrast violations and one moderate landmark uniqueness issue on claim overview.

Why it matters: Contrast and landmark issues may not block first outreach but can reduce confidence and accessibility quality for a broader launch.

MVP goal impacted: Trust/professional confidence and accessibility basics.

Recommended fix: Audit badge/text contrast and repeated landmarks in the app shell/claim page; fix as a focused accessibility polish pass.

Timing: After first conversations.

### UX-006 - P3 - Communications label should be validated with users

Route: `/claims/[id]/communications`  
Task: Claim communication log  
Evidence: `artifacts/ux-study/2026-06-11-1612/17-claim-communications.png`

What happened: The communication route loaded clearly, but creating a note was covered by smoke tests rather than this UX run.

Why it matters: The flow appears implemented, but future moderated sessions should confirm whether offices think of this as notes, activity, communications, or timeline.

MVP goal impacted: Log notes, calls, emails, texts, meetings, and inspections.

Recommended fix: Ask users what label they expect for this area before renaming or reorganizing.

Timing: Monitor.

## 5. Top 10 Recommended Improvements

1. Add a guided first-money helper on `/claims/[id]/money`: settlement -> fee invoice -> payment/check.
2. Add first-use guidance to `/today` when the workspace is sparse.
3. Strengthen Money empty states so users know whether to start with a settlement, invoice, or payment.
4. Keep public CTA and signup copy aligned with actual logged-in start workflow.
5. Add a short safety reminder near client status link creation explaining what clients can and cannot see.
6. Add concise admin-only guidance around bootstrap password and workspace provisioning controls.
7. Fix color contrast issues from axe scans in a focused accessibility pass.
8. Investigate the claim overview landmark uniqueness issue from axe.
9. Keep mobile work focused on reading/reviewing before optimizing heavy data entry.
10. Extend the UX harness later to include CSV import and lead conversion as first-class UX tasks.

## 6. What Not To Change Yet

- Do not rename core public-adjuster terms such as Claim, Client, Property, Carrier, Follow-up, Documents, Settlement, Check, Fee, Invoice.
- Do not redesign the app shell; the sidebar/tabs model is working.
- Do not overbuild mobile claim intake until real offices confirm mobile data entry demand.
- Do not add complex automation, valuation, or coverage logic; the MVP promise is office organization.
- Do not expose admin/system tools to normal users; current separation is correct.
- Do not over-polish admin pages ahead of customer-facing money/today improvements.

## 7. Suggested Next Research

Run 3-5 moderated sessions with representative users:

1. Solo public adjuster who currently uses spreadsheets and folders.
2. Small-office owner with 2-3 adjusters and an assistant.
3. Office staff member responsible for follow-ups/documents/invoices.
4. Technically comfortable adjuster who already uses cloud storage and QuickBooks.
5. Less technical staff member who handles intake and client update calls.

Session tasks:

- Explain what the homepage says AdjusterDesk does.
- Create a lead from a phone call.
- Open a claim and schedule next work.
- Request or upload a document.
- Create a client status link and decide whether it feels safe to send.
- Record a settlement/fee invoice/check.
- Find what to work on today.

Questions to ask:

- What words felt familiar or unfamiliar?
- Where did you hesitate?
- What would you expect to happen next?
- Would this replace a spreadsheet, folder, reminder, or QuickBooks note?
- What would stop you from using it for real claims?

## 8. Automation Notes

The UX harness changed only QA workspace data:

- Created QA lead and claim records.
- Uploaded a generated dummy text file in QA workspace only.
- Created client status link, task, settlement, and invoice in QA workspace only.
- Verified normal QA user cannot access `/system`.
- Verified admin QA user can access `/system` and `/system/workspaces`.

No product behavior was changed during the study run.
