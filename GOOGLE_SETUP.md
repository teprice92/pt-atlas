# Google Docs connection setup

PT Atlas uses a browser OAuth token flow and Google Picker. Configuration is optional: local text/Markdown/DOCX imports and the offline library work without Google setup. No server or client secret is required. **Do not paste a client secret or service-account credential into PT Atlas.**

## Google Cloud project

1. Create or select a project at https://console.cloud.google.com/.
2. Enable **Google Picker API**, **Google Drive API**, and **Google Docs API** in APIs & Services → Library.
3. In Google Auth Platform, configure the app name, support contact and audience. For External apps in Testing, add the Google accounts you will test with as test users. Review Google's publishing/verification requirements before making the integration available to others.
4. Configure Data Access for the scope `https://www.googleapis.com/auth/drive.file`. PT Atlas requests this selected-file scope, not access to your entire Drive. Google describes this scope as allowing management of selected files; PT Atlas uses it only for GET requests and does not modify documents. Documents must be explicitly selected in Picker. Picker allows browsing folders and selecting up to 10 native Google Docs at once; selecting/importing an entire folder is not implemented.
5. Create an OAuth client of type **Web application**. Add these Authorized JavaScript origins as applicable:
   - `https://teprice92.github.io` (origin only; no `/pt-atlas/` path)
   - `http://localhost:8080` for the README's local server
   - Each other exact scheme/host/port used for development
   The popup token flow does not require an app redirect URI. Enable JavaScript and allow Google sign-in popups in the browser.
6. Create an API key for Picker in the same project. Restrict it to **Websites (HTTP referrers)** such as `https://teprice92.github.io/*` and `http://localhost:8080/*`. For API restrictions, enable Google Picker API. Use an origin-wide referrer pattern because browsers may omit the page path on cross-origin requests. Confirm Picker's current key restriction requirements if Google reports a blocked key; do not remove restrictions for production.
7. Copy the project's numeric **project number** (not project ID), OAuth client ID, and browser API key.

## In PT Atlas

1. Open Import → Connect Google Docs → Google connection setup.
2. Enter the three public values and choose Save Google setup. They are saved in this browser; they are not uploaded with your library backup.
3. Choose Google Docs once to load the Google libraries. Choose it again to launch sign-in and Picker in response to your click. This two-step first connection avoids browsers blocking the sign-in popup after script loading.
4. Select native Google Docs. Optionally enable heading splitting before choosing. PT Atlas reads document metadata and structured text (including headings, list items, tables, and document tabs).
5. Review every draft and its source, region, and condition. Select skip, create separate, or append for title/region duplicates. Confirm import to save locally. No Google document is edited.
6. Disconnect Google clears the in-memory token and asks Google to revoke its authorization. Reloading discards tokens but does not revoke prior account grants. To remove persistent account authorization, use https://myaccount.google.com/connections.

Access tokens are never saved to localStorage, IndexedDB, JSON backups, or service-worker caches. Picker, sign-in, and API reads require the network. The service worker only caches app-owned assets under the app's own scope. Google libraries are not loaded until explicitly requested. An already saved library remains offline-accessible.

## Verify with a real account

This integration is tested with mocked Google endpoints in CI; a live sign-in has not been verified without your project values. After configuring, use a harmless Google Doc containing a heading, list, and table. Select two docs and verify their source names, timestamps, and IDs in a JSON export after confirming review. Test cancel, deny permission, expired access (reconnect), and offline mode. Confirm the consent screen requests selected-file access, and use the Google account connection page to inspect/revoke grants.

Google Docs features such as embedded media, drawings, comments, exact list numbering, equations, footnotes, and formatting are not fully extracted. No automatic re-sync, whole-folder import, or write-back occurs. Subsequent imports require review; they never silently overwrite your knowledge library.
