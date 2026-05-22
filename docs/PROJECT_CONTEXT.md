# AdjusterDesk Project Context

AdjusterDesk is the simple workspace for small public adjusting offices. The MVP helps a solo to 5-person public adjusting firm keep leads, claims, follow-ups, documents, communications, settlements, checks, fees, and invoices in one place.

## Primary Promise

Run a small public adjusting office without scattered spreadsheets, missed follow-ups, lost documents, or unclear receivables.

## Target Customer

Small public adjusting offices that manage work today with spreadsheets, email, text messages, folders, QuickBooks, calendar reminders, and memory.

## Product Boundaries

AdjusterDesk does not provide legal advice, automated coverage determinations, claim valuation advice, or autonomous adjusting. The product is an office workspace and tracking system.

## Local MVP Architecture

- Next.js App Router, TypeScript, React, and Tailwind CSS.
- Prisma ORM with SQLite for local development.
- Seeded demo firm and demo users instead of production authentication.
- Server components for database-backed pages.
- Server actions for core form submissions.
- Route handlers for CSV exports.
- Local file storage abstraction for development uploads.

## MVP Navigation

- Today
- Leads
- Claims
- Money
- Reports
- Templates
- Users
- CSV Import
- Public claim status page by token

## Demo Firm

The seeded firm is Harbor Public Adjusting. The demo scenario follows a water damage lead that converts into a claim, receives documents and communication logs, records a carrier offer, settlement payment, fee calculation, and unpaid invoice.
