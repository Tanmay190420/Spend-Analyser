# Spend Analyser — PWA

Personal expense tracking and monthly analysis PWA.

## Current prototype
- Daily expense entry
- INR (₹)
- Categories and payment methods
- Dashboard
- 7-day spending chart
- Expense history and search
- Monthly category analytics
- Month-over-month comparison
- Monthly budget
- CSV export
- Dark mode
- Local storage fallback

## Planned online sync architecture
Spend Analyser will be deployed over HTTPS and use Google authentication with a Google Sheet stored in the user's Google Drive as the cloud data store.

Target flow:
PWA → Google Sign-In/OAuth → Google Sheets API → user's Google Drive

The Google Sheet will contain expense records such as:
Date, Amount, Category, Note, Payment Method, ID, Created At.

The app should:
1. Sign the user in with Google.
2. Locate/create a dedicated Spend Analyser spreadsheet in the user's Drive.
3. Read expenses from the sheet.
4. Write new expenses to the sheet.
5. Update/delete expense rows when edited/deleted.
6. Cache recent data locally for a fast UI/offline resilience.
7. Sync changes when connectivity returns.
8. Never expose a Google API secret in browser code.

## Deployment
The PWA requires HTTPS for service-worker installation and production Google OAuth redirect flows.

The next implementation phase should configure a Google Cloud project, enable Google Sheets API and Google Drive API, create OAuth credentials for a web app, and add the authorized production origin/redirect URI.

For a simple personal app, use the minimum OAuth scopes needed. Prefer a dedicated spreadsheet created by the app and restrict access to the signed-in user's Drive.

## Important
Do not put a Google service-account private key or other secret in the PWA JavaScript. Browser apps must use OAuth authorization.
