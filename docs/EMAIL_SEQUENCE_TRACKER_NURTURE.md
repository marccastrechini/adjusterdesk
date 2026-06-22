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

If your spreadsheet is starting to feel like too much, we'd like to invite you 
to try AdjusterDesk with your first 10 active claims. It's free for 14 days, 
no credit card required.

Founding offices get:
- 14-day free trial (no credit card needed)
- Try it with your first 10 claims
- Priority email support during feedback period
- Early pricing locked in for 12 months
- Direct input on what we build next

What we need from you:
- Use it with 5-10 real active claims
- Share what works and what doesn't via email
- Let us know when you're ready to move more claims

It takes 15 minutes to set up. Keep your spreadsheet running in parallel. 
No lock-in, cancel anytime.

[Start Free Trial] — https://adjusterdesk.xyz/signup

If the spreadsheet is still working great for you, no pressure. Keep the tracker. 
Reach out if things change.

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
