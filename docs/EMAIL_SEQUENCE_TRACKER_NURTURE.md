# Email Sequence: Free Claim Tracker Nurture

**Trigger:** `claim_tracker_download` conversion event  
**Sequence Length:** 3 emails  
**Timing:** Day 0, Day 3, Day 7  
**Platform:** To be configured with email service (e.g., Loops.so, SendGrid)  
**UTM Parameters:** `utm_source=email&utm_medium=nurture&utm_campaign=tracker_seq&utm_content=email_N`

---

## Email 1: Deliver & Enable

**Subject:** Your free public adjuster claim tracker is ready  
**Send:** Immediately after download  
**Goals:**
- Confirm delivery
- Provide quick-start instructions
- Lower friction to first use
- Emphasize immediate value

---

**Copy:**

```
Subject: Your free public adjuster claim tracker is ready

Hi [Name],

Your free claim tracker is here. This is a simple spreadsheet template 
built specifically for how small public adjusting offices actually work.

Here's how to get started in 5 minutes:

1. Open the downloaded file in Excel, Google Sheets, or your spreadsheet app
2. Add your current active leads and open claims
3. Fill in the key columns: client contact, property, carrier, claim #, dates, 
   follow-up needs, documents, and fee status
4. Set your next follow-up dates so nothing slips

The template has 17 columns built for public adjuster language:
- Claim Name, Client Name, Phone, Email, Property Address
- Carrier, Claim Number, Loss Type, Date of Loss, Claim Status
- Next Follow-Up Date, Documents Needed, Settlement Amount
- PA Fee %, PA Fee Amount, Invoice Status, Notes

Start with your 5-10 most active claims. You can add more as you go.

No login, no setup, no learning curve—just your claims organized in one place.

Questions? Reply to this email and we'll help.

Best,
[Founder name]
AdjusterDesk
```

---

## Email 2: Reveal the Problem

**Subject:** This is where spreadsheets get messy  
**Send:** 3 days after download  
**Goals:**
- Identify pain points
- Normalize the struggle
- Prime them for software solution
- Create urgency without hard sell

---

**Copy:**

```
Subject: This is where spreadsheets get messy

Hi [Name],

Using the free tracker for a few days yet?

We talk to adjusters every week who've hit the same wall:

✓ One claim spreadsheet works fine.
✓ Ten claims? Still manageable.
✓ But then...

— Follow-ups start falling through the cracks
— You're texting yourself reminders because the spreadsheet doesn't have dates
— Your helper can't see which documents are actually missing
— Settlements and fees are in three different places
— You're updating the same claim details in spreadsheets AND QuickBooks

The free tracker gets you organized. But coordination, visibility, and 
follow-up reliability? That's where software helps.

You might not be there yet—and that's fine. But when coordination becomes 
a problem, AdjusterDesk makes it simple again.

When should you move?
- Tracking 15+ active claims
- Working with a partner or helper
- Deadlines are hard to track in a spreadsheet
- Client updates feel scattered

That's when we recommend trying a 14-day free trial.

If you're not there yet, keep the tracker. No rush.

Best,
[Founder name]
AdjusterDesk
```

---

## Email 3: Invite to Trial

**Subject:** Ready to try AdjusterDesk? Here's your founding office option  
**Send:** 7 days after download  
**Goals:**
- Convert to trial signup
- Remove friction with low-cost offer
- Emphasize low-risk testing
- Provide clear call-to-action

---

**Copy:**

```
Subject: Ready to try AdjusterDesk? Here's your founding office option

Hi [Name],

We're building AdjusterDesk with real public adjusters like you.

If follow-ups, documents, and fees are slipping across email and files, start 
AdjusterDesk with your first 10 active claims.

First 10 founding offices: $0 for 90 days, then $29/month Solo or $49/month 
Small Office, locked for 12 months. Standard pricing is Solo $49/month and 
Small Office $99/month.

Stripe Checkout collects a card at signup. For the first 10 founding offices, 
$0 is due during the 90-day trial, then $29/month Solo or $49/month Small 
Office, locked for 12 months. Async onboarding, no sales call.

[See founding desk offer] — https://adjusterdesk.xyz/founding-public-adjuster-offices

Prefer a sheet for now? Keep the tracker.

Best,
[Founder name]
AdjusterDesk
```

---

## Configuration Notes

### Event Tracking
- Use `utm_source=email&utm_medium=nurture` on all links
- Email 1: `utm_content=email_1_deliver`
- Email 2: `utm_content=email_2_problem`
- Email 3: `utm_content=email_3_invite`

### List Management
- Trigger: Users who complete `claim_tracker_download` conversion event
- Suppress if: User has already started a trial (`trial_created` event)
- Suppress if: User unsubscribes from email

### Next Steps
1. Configure sequence in email service platform
2. Set send times for optimal engagement (e.g., 10am local timezone)
3. Monitor open rates, click rates, trial conversion rate
4. Adjust copy/timing based on performance
