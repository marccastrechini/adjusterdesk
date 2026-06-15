# GA4 Conversion Events for Acquisition and Activation

## Current Google Ads event in use
- trial_start_click

This event is active for early signal collection. Keep it in place while stronger conversion events accumulate data.

## Recommended GA4 key events
Mark these as GA4 key events after they are observed in production:
- trial_created
- sign_up
- claim_tracker_download
- first_claim_created

## Supporting engagement events to keep
- pricing_click
- login_click
- trial_start_click

These are useful for funnel behavior and page engagement even when they are not the main optimization target.

## Event intent
- sign_up: completed account creation/signup flow.
- trial_created: free trial is successfully created.
- workspace_created: workspace is successfully created.
- first_claim_created: user creates their first claim.
- claim_tracker_download: successful click/download of the public tracker file.

## Transition guidance for Google Ads
trial_start_click is useful in early testing. As enough volume is collected, it should be supplemented or gradually replaced for optimization by stronger events such as trial_created and sign_up to improve lead quality signals.

## Manual GA4 follow-up steps
1. Go to GA4 Admin.
2. Open Events.
3. Confirm new events are arriving in production.
4. Mark trial_created, sign_up, and claim_tracker_download as key events once observed.
5. Optionally mark first_claim_created as a quality/activation key event once volume is sufficient.
6. In Google Ads, import the stronger GA4 key events and adjust optimization/reporting to use them over time.
