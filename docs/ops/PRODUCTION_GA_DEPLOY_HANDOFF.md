# Production GA Deploy Handoff

This handoff is for the production deploy machine. Do not run these steps from the laptop.

## 1. Set Production Env Variable
Add the GA4 measurement ID to the production environment file used by the production runner:

NEXT_PUBLIC_GA_MEASUREMENT_ID=G-QM2L44CMB2

Likely files to check:
- .env.production
- .env.production.local

If both exist, update the one actually loaded by the production run script.

## 2. Rebuild and Restart Production
NEXT_PUBLIC values are bundled at build time in Next.js, so a restart alone is not enough unless it also rebuilds.

Required outcome:
- Build with updated production env
- Restart the production runtime

Use the existing project production scripts documented in docs/LOCAL_PRODUCTION.md.

## 3. Verify Public URLs Return 200
Verify these routes after deploy:
- https://adjusterdesk.xyz/
- https://adjusterdesk.xyz/login
- https://adjusterdesk.xyz/public-adjuster-software
- https://adjusterdesk.xyz/free-public-adjuster-claim-tracker

## 4. Verify GA Script Is Live
In browser view-source or DevTools on production pages, confirm one of:
- G-QM2L44CMB2 appears in page/script payload
- Request to googletagmanager is present

## 5. Verify Analytics Realtime
Open Google Analytics Realtime and then visit the site pages above.

Expected result:
- Active user appears in Realtime
- Page views/events are received

## 6. Quick CTA Event Spot Check (Optional)
From the public site, click these and confirm events in GA DebugView/Realtime if available:
- Start free trial -> trial_start_click
- Pricing link -> pricing_click
- Login link -> login_click
- Claim tracker download -> claim_tracker_download_click

## 7. Search Console Crawler Verification
Run these commands from PowerShell after deploy/restart:

```powershell
curl.exe -I https://adjusterdesk.xyz/sitemap.xml
curl.exe -A "Googlebot" -I https://adjusterdesk.xyz/sitemap.xml
curl.exe https://adjusterdesk.xyz/sitemap.xml
curl.exe -I https://adjusterdesk.xyz/robots.txt
curl.exe https://adjusterdesk.xyz/robots.txt
```

Expected results:
- `/sitemap.xml` returns `200 OK`
- `Content-Type` for `/sitemap.xml` is `application/xml`
- Sitemap XML includes required public URLs:
	- `https://adjusterdesk.xyz/`
	- `https://adjusterdesk.xyz/public-adjuster-software`
	- `https://adjusterdesk.xyz/free-public-adjuster-claim-tracker`
	- `https://adjusterdesk.xyz/pricing`
	- `https://adjusterdesk.xyz/signup`
- `/robots.txt` returns `200 OK`
- `/robots.txt` includes `Sitemap: https://adjusterdesk.xyz/sitemap.xml`
- Googlebot user-agent request to `/sitemap.xml` is not challenged or blocked
