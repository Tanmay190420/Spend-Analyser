# Spend Analyser

Personal PWA for daily expense tracking and monthly analysis.

## Current features
- Add daily expenses in INR
- Categories and payment methods
- Monthly total, budget progress and transaction count
- 7-day spending chart
- Category analytics and month comparison
- Searchable expense history
- CSV export
- Dark mode
- Offline/local browser copy
- Google Drive sync using Google OAuth + Google Sheets API

## Google setup
The web app uses Google Identity Services in the browser. It requests only:
`https://www.googleapis.com/auth/drive.file`

This is the recommended narrow, non-sensitive Drive scope for creating and managing files used by the app. No client secret or service-account key is included in the browser code.

The app creates/uses a spreadsheet named **Spend Analyser Data** in the user's Google Drive and keeps an `Expenses` sheet plus a `Settings` sheet.

## Deployment
The app is designed for GitHub Pages. Add the GitHub Pages origin to the OAuth client's **Authorized JavaScript origins**. No redirect URI is required for the popup/token flow used here.

## Important
The repository can be public because it contains no private credentials. The Google OAuth client ID is intended to be used in browser code. Never add a Google client secret, service-account private key, or access token to this repository.
