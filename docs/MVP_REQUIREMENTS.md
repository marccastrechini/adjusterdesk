# MVP Requirements

## Core Records

- Firm
- User
- Contact
- Lead
- Property
- Policy
- Carrier
- Claim
- Task
- Document
- Activity / communication log
- SettlementRound
- Payment
- FeeRule
- Invoice
- ClientStatusLink
- Template

## Required Screens

- `/today`
- `/leads`
- `/leads/new`
- `/leads/[id]`
- `/claims`
- `/claims/new`
- `/claims/[id]`
- `/claims/[id]/tasks`
- `/claims/[id]/documents`
- `/claims/[id]/communications`
- `/claims/[id]/money`
- `/money`
- `/settings/templates`
- `/settings/users`
- `/start/import`
- `/settings/import`
- `/reports`
- `/status/[token]`

## Core Workflows

1. Seed a demo firm and demo users.
2. Show a Today view with overdue tasks, due today, upcoming deadlines, claims waiting on carrier, unpaid invoices, and recent claims.
3. Capture leads with source, contact info, property address, loss type, date of loss, notes, status, and follow-up date.
4. Convert a lead to a claim.
5. List, search, filter, create, and view claims.
6. Track tasks, assignment, due dates, completion, and overdue state.
7. Track claim documents and local development uploads.
8. Log notes, calls, emails, texts, meetings, and inspections.
9. Record settlement offers, payments/checks, fee percentage, calculated fee amount, invoices, and receivables.
10. Provide a public client status page by token.
11. Export leads, claims, and invoices to CSV.
12. Import leads and claims from CSV with template downloads, row review, and plain validation messages before records are created.
13. Show simple reports for claim status, overdue work, deadlines, lead sources, and receivables.

## Non-Goals For MVP

- Production-grade authentication and billing.
- Legal advice or automated claim valuation.
- Carrier integrations.
- QuickBooks sync.
- Email/SMS sending.
- Advanced permissions.
