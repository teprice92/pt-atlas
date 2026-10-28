# Google Docs connection setup

PT Atlas uses a browser OAuth token flow and Google Picker. Configuration is optional: local text/Markdown/DOCX imports and the offline library work without Google setup. No server or client secret is required. **Do not paste a client secret or service-account credential into PT Atlas.**

## Google Cloud project

1. Create or select a project at https://console.cloud.google.com/.
2. Enable **Google Picker API**, **Google Drive API**, and **Google Docs API** in APIs & Services → Library.
3. In Google Auth Platform, configure the app name, support contact and audience. For External apps in Testing, add the Google accounts you will test with as test users. Review Google's publishing/verification requirements before making the integration available to others.
4. Configure Data Access for the scopes `https://www.googleapis.com/auth/drive.file` (imports) and `https://www.googleapis.com/auth/drive.appdata` (device sync). Neither is a restricted scope, so no paid security assessment applies. The Data Access page labels each scope's sensitivity; follow Google's current verification guidance before publishing the app beyond your test users. PT Atlas requests this selected-file scope, not access to your entire Drive. Google describes this scope as allowing management of selected files; PT Atlas uses it only for GET requests and does not modify documents. Documents must be explicitly selected in Picker. Picker allows browsing folders and selecting up to 25 native Google Docs at once.
5. Create an OAuth client of type **Web application**. Add these Authorized JavaScript origins as applicable:
   - `https://teprice92.github.io` (origin only; no `/pt-atlas/` path)
   - `http://localhost:8080` for the README's local server
   - Each other exact scheme/host/port used for development
   The popup token flow does not require an app redirect URI. Enable JavaScript and allow Google sign-in popups in the browser.
6. Create an API key for Picker in the same project. Restrict it to **Websites (HTTP referrers)** such as `https://teprice92.github.io/*` and `http://localhost:8080/*`. For API restrictions, enable Google Picker API. Use an origin-wide referrer pattern because browsers may omit the page path on cross-origin requests. Confirm Picker's current key restriction requirements if Google reports a blocked key; do not remove restrictions for production.
7. Copy the project's numeric **project number** (not project ID), OAuth client ID, and browser API key.

## Turn it on for everyone who visits the site (recommended)

Edit `site-config.mjs` in the repository and fill in the three public values from step 7:

```js
export const SITE_CONFIG={
 google:{
  clientId:'1234567890-abc123.apps.googleusercontent.com',
  apiKey:'AIza…',            // the browser key restricted in step 6
  projectNumber:'1234567890'
 }
};
```

Commit to `main`. The Pages workflow redeploys the site, and every visitor then sees **Connect Google account** (Settings) and **Choose Google Docs** (Import) with no per-browser setup. These values are not secrets: browsers can always see them, and Google limits them to your allowed origins and APIs. **Never put a client secret or service-account key in this file.** While the values are blank, Google features stay off and the rest of the app works normally.

## Or use a project in one browser only

Import → Connect Google Docs → **Google connection setup** stores the same three values in that browser only. A browser-level project overrides the site configuration; **Clear browser setup** goes back to the site's project.

## Using it

1. **Settings → Google account → Connect Google account.** The first click loads Google's sign-in library and the second opens sign-in, so the browser doesn't block the popup. Access lasts about an hour for the session and is never saved.
2. **Import → Choose Google Docs.** Pick up to 25 native Google Docs. To bring in a folder, open it in the picker and select the documents inside it (Shift-click selects a range). Optionally split headings into separate entries. Labelled sections such as "Dosage:" or a "Precautions" Heading 3 fill the matching fields (see the README's label table). Every draft goes through the review screen before anything is saved.
3. **Import → Check imported Docs for updates.** PT Atlas compares each linked document's modified time in Drive with the version you imported, then shows a line-by-line diff for each changed entry. For each one you choose **Skip for now** (the default; it is offered again next time), **Replace the imported text**, or **Append the new version to my notes**. New sections can be added as new entries. Sections removed from the document leave your entries untouched. Replaced versions stay in revision history, and updated entries are marked Needs review. If you edited an entry after importing it, the review warns you before you replace it. Documents that were deleted, trashed or are no longer shared are reported and skipped.
4. **Disconnect Google** clears the in-memory token and asks Google to revoke it. To remove the app's access entirely, use https://myaccount.google.com/connections.

### Sync across devices

Settings → Sync across devices → **Turn on Google Drive sync** asks Google for one more permission, the hidden app folder (`drive.appdata`). PT Atlas keeps the library there as `pt-atlas-library.json`, with one `pt-atlas-media-…` file per attachment. You can't browse this folder in Drive; Drive → Settings → Manage apps shows PT Atlas and lets you delete its hidden data. Turn sync on in each browser or device you use. **Remove synced copy from Google Drive** deletes these files from inside the app.

To test it: turn sync on in two browsers signed in to the same Google account, add an entry in one, then press Sync now in the other.

### Why whole folders can't be imported in one click

PT Atlas uses the `drive.file` permission, which only covers files you explicitly pick. That is what lets it avoid Google's restricted-scope security assessment, and it means the app can never see the rest of your Drive. Reading every file in a folder automatically would need the restricted `drive.readonly` scope, which requires a paid third-party security assessment for a public app. Selecting the documents inside a folder in the picker gives the same result. Re-sync keeps working for every document you have picked before, because `drive.file` access persists for those files.

Access tokens are never saved to localStorage, IndexedDB, JSON backups, or service-worker caches. Picker, sign-in, and API reads require the network. The service worker only caches app-owned assets under the app's own scope. Google libraries are not loaded until explicitly requested. An already saved library remains offline-accessible.

## Verify with a real account

This integration is tested with mocked Google endpoints in CI; a live sign-in has not been verified without your project values. After configuring, use a harmless Google Doc containing a heading, list, and table. Import it, edit the doc in Google, then use Check imported Docs for updates and confirm the diff. Select two docs and verify their source names, timestamps, and IDs in a JSON export after confirming review. Test cancel, deny permission, expired access (reconnect), and offline mode. Confirm the consent screen requests selected-file access, and use the Google account connection page to inspect/revoke grants.

Google Docs features such as embedded media, drawings, comments, exact list numbering, equations, footnotes, and formatting are not fully extracted. Re-sync is one-way (Google → PT Atlas), runs only when you ask for it, and never applies changes without your review. Nothing is ever written back to Google Drive.
