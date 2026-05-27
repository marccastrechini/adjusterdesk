# AdjusterDesk MVP Demo Script

This script is for a friendly 10-15 minute pilot walkthrough with a solo public adjuster.

It follows the exact MVP path:

1. Start local app
2. Sign in
3. Today view
4. Lead intake
5. Convert lead to claim
6. Claim overview
7. Tasks and deadlines
8. Documents upload/download
9. Client status page
10. Money and receivables
11. Backup before and after demo

## Before You Start (2-3 minutes)

### 1) Reset to a clean demo state (optional but recommended)

Use this when you want to start from the same story every time:

```powershell
npm run demo:reset:local -- -ConfirmReset
```

### 2) Create a backup before the demo

```powershell
npm run backup:local
```

### 3) Build and start the app

```powershell
npm run prisma:generate
npm run build
npm run start
```

Open:

- `http://localhost:3000/login`

If port 3000 is in use, start on 3001:

```powershell
npm run start -- --port 3001
```

Then use `http://localhost:3001/login`.

### 4) Sign in with seeded demo user

Use:

- `dana@harboradjusting.example`
- `AdjusterDeskDemo123!`

## Walkthrough Steps

### Step A: Today view (home base)

Open `/today`.

Point out:

- overdue and due-today tasks
- upcoming deadlines
- leads due for follow-up
- waiting-on-carrier items
- unpaid receivables

Talk track:

"This is my daily office board. I can see what must be handled first, what is coming up next, and what money is still open. It keeps me from missing follow-ups."

### Step B: Lead intake (new call)

Open `/leads/new`.

Create a simple lead:

- First name: `Mason`
- Last name: `Reed`
- Phone: `(813) 555-0190`
- Address: `255 Bayshore Drive`
- City: `Tampa`
- State: `FL`
- ZIP: `33606`
- Loss type: `Water damage`
- Source: `Referral`
- Follow-up date: today
- Optional note: `Kitchen leak after storm. Wants a same-day callback.`

Save the lead.

Talk track:

"When a new call comes in, I capture just what I need to keep moving: who it is, where the loss is, and the next follow-up date."

### Step C: Convert lead to claim

From that lead detail page, use **Convert to claim**.

You can leave carrier details blank or add sample values:

- Carrier: `Sun State Insurance`
- Policy number: `SSI-HO-990011`
- Carrier claim number: `SSI-25-02001`
- Next step: `Call carrier desk and confirm first inspection window.`

Set first follow-up date to today (or next business day), then convert.

Talk track:

"Once intake is ready, I convert the lead into a claim in one step. The first claim task is created automatically so nothing drops."

### Step D: Claim overview

On `/claims/[id]` for the new claim, show:

- status and next step
- client, property, carrier, claim basics
- what-to-work-next cards (Tasks, Documents, Notes, Money)

Talk track:

"This page gives me one clear snapshot of where the claim stands and what the next office action is."

### Step E: Tasks and deadline

Open `/claims/[id]/tasks`.

Show:

- existing open task
- adding a new task
- updating claim deadline and next step

Talk track:

"I track every follow-up here, assign it, and set dates. Today updates from this so the day stays organized."

### Step F: Documents upload/download

Open `/claims/[id]/documents`.

1. Upload one small local test file (for example a `.txt` note).
2. Confirm it appears with title, category, upload date, and who added it.
3. Click **Open or download file**.

Talk track:

"I can keep a clean claim file with uploads and document requests in one place. If a local file is missing, the page flags it clearly so I can re-upload it."

### Step G: Client status page

Open `/claims/[id]/client-status`.

Show:

- summary and next-step editor
- status link creation/copy
- preview panel

Optionally open the public page from the generated link.

Talk track:

"This gives clients a simple update page without exposing internal notes, tasks, or money screens."

### Step H: Money and receivables

Open `/money`.

Show:

- outstanding receivables
- overdue invoices
- recent checks/payments
- drill-in from invoice to claim money tab

Talk track:

"This is where I quickly see what fee money is still open and what was already collected."

### Step I: Confirm Today still coherent

Go back to `/today`.

Confirm:

- the new converted claim and task flow make sense
- no broken worklist sections

Talk track:

"After intake, conversion, and document updates, Today still gives me a coherent work order for the office."

## After Demo (1 minute)

### 1) Backup again

```powershell
npm run backup:local
```

### 2) Optional reset to demo baseline

```powershell
npm run demo:reset:local -- -ConfirmReset
```

## Presenter Tips

- Keep language operational and plain: claim, follow-up, deadline, documents, check, fee, invoice.
- Avoid technical architecture details unless asked.
- Show one complete story from intake to receivable instead of clicking every menu.
- If asked about reliability, emphasize local backups and restore workflow.
