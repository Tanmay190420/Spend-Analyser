# Spend Analyser

Personal PWA for daily expense tracking and monthly analysis.

## Google Drive sync

The app uses Google Identity Services in the browser and the Google Sheets/Drive APIs. It stores data in a spreadsheet named **Spend Analyser Data** in the signed-in user's Google Drive.

OAuth client ID is public browser configuration; no client secret is stored in this repository.

Required Google Cloud APIs:
- Google Sheets API
- Google Drive API

OAuth:
- Application type: Web application
- Authorized JavaScript origin: `https://tanmay190420.github.io`
- Redirect URIs: not required for the popup token flow used by this app.

The app requests `https://www.googleapis.com/auth/drive.file`, so it can work with files created/used by Spend Analyser rather than requesting full Drive access.
