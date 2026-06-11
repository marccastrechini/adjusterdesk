# AdjusterDesk Production UX Study Plan

## Study Purpose

Evaluate whether AdjusterDesk feels simple, natural, practical, and real for solo to 5-person public adjusting offices. This study is a production-facing audit using dedicated QA accounts and QA workspace data only. It does not change product behavior or strategy.

## Source Inputs Reviewed

- `README.md`
- `docs/MVP_REQUIREMENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/PRICING_MODEL.md`
- `docs/MARKET_FEEDBACK_SCORECARD.md`
- `docs/BUILD_PLAN.md`
- `docs/SELF_SERVICE_READINESS.md`
- `docs/WORKSPACE_ADMIN.md`
- `tests/smoke/production-qa.spec.ts`
- `tests/smoke/demo-flow.spec.ts`

## Target User

Small public adjusting offices that currently rely on spreadsheets, email, text messages, folders, QuickBooks, calendar reminders, and memory. Primary users are solo adjusters, owners, adjusters, and small-office staff who are comfortable with common business software but should not need training to understand AdjusterDesk's core workflow.

## Product Positioning

AdjusterDesk is a simple operating workspace for public adjusting offices. Its promise is to help offices keep leads, claims, follow-ups, documents, communications, settlements, checks, fees, invoices, and receivables in one place without claiming legal advice, claim valuation, automated coverage decisions, or carrier/accounting integrations.

## Core Workflows Under Study

1. Public/prospect evaluation of homepage, pricing, login, password reset, trust/footer pages.
2. First login and daily orientation through Today.
3. First-run setup through Start.
4. Lead intake and validation.
5. Claim intake and claim detail orientation.
6. Claim work across documents, tasks, communications, money, and client status tabs.
7. Client status sharing and logged-out client view.
8. Task creation/completion.
9. Document upload with generated dummy QA file.
10. Money/reports review and basic settlement/invoice flow.
11. Settings and workspace setup review.
12. Normal-user permission check against `/system`.
13. Admin QA check of `/system` and `/system/workspaces`.
14. Accessibility/keyboard/mobile basics.

## Rubric

Each dimension is scored 1-5.

- 1 = blocks or confuses
- 2 = high friction
- 3 = usable but needs polish
- 4 = good
- 5 = excellent/simple/natural

Dimensions:

1. First-glance clarity
2. Next-step clarity
3. Match with public-adjusting office language
4. Navigation confidence
5. Cognitive load
6. Error prevention
7. Error recovery
8. Recognition over recall
9. Empty-state usefulness
10. Accessibility/keyboard basics
11. Mobile/responsive basics
12. MVP alignment
13. Trust/professional confidence

## Automation Method

Command:

```bash
npm run ux:study:prod
```

Runner:

- `scripts/run-ux-study.ts`

Behavior:

- Loads `.env.qa.local` locally without printing credentials.
- Uses `AD_QA_BASE_URL`, defaulting to `https://adjusterdesk.xyz`.
- Logs in as the normal QA user and admin QA user.
- Captures full-page screenshots and body text snapshots.
- Captures console errors, page errors, and non-aborted network failures.
- Records click and text-entry counts where practical.
- Stores raw evidence under ignored artifact folders: `artifacts/ux-study/<YYYY-MM-DD-HHMM>/`.
- Runs representative axe-core scans where available plus structural keyboard/label checks.

## Evidence Handling

Raw screenshots, text snapshots, and axe JSON files are intentionally ignored by Git. Reports reference artifact paths so the local reviewer can inspect evidence without committing large or sensitive operational artifacts.

Latest study evidence used for this report:

- `artifacts/ux-study/2026-06-11-1612/`

## Success Criteria

AdjusterDesk meets the MVP usability goal if:

- Core office workflows are discoverable without training.
- Public-adjusting terminology is plain and familiar.
- Normal users can work leads, claims, documents, tasks, client updates, money, reports, and settings without admin/demo/test leakage.
- Public pages set expectations that match the logged-in product.
- Empty states point to useful next actions.
- Admin/system tools are gated away from normal users.
- Accessibility and mobile basics do not block first conversations.
