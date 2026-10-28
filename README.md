# PT Atlas — Offline-first PT intervention library (v0.1)

A real, dependency-free progressive web app starter for organizing PT conditions, interventions, protocols, and precautions.

## Run locally

From this directory run:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 in Chrome, Edge, Firefox, or Safari. Install from the browser's install/add-to-home-screen option after loading once. **Do not open `index.html` directly from a file manager**: service workers require localhost or HTTPS.

## Publish

Upload these files to a static HTTPS host (GitHub Pages, Cloudflare Pages, Netlify, Vercel). No build step is required. For GitHub Pages, set Settings > Pages > Deploy from a branch, root directory. The PWA uses relative asset paths and works under a repository subpath.

## Features implemented

- Responsive dark/light dashboard and branded icon
- Browse eight body regions and 16 editable starter condition templates (no invented clinical guidance)
- Create/edit/delete interventions and conditions
- Record protocols, precautions, instructions, dosage, references, and notes
- Local full-text search, favorites, recently updated entries
- Offline local persistence in IndexedDB and cached PWA shell
- Paste content from Google Docs for review before saving as an intervention
- JSON backup export and import

## Not implemented yet

- Direct Google OAuth / Google Docs API / Google Drive folder import
- Automated parsing and clinical categorization
- Cloud authentication and cross-device sync
- Offline media downloads and conflict resolution
- PDF/DOCX document extraction
- Multi-condition relational links and revision history

**Important:** This is a personal knowledge organizer, not a validated clinical decision-support system. No clinical instructions are seeded. Verify protocols and patient-specific orders. Do not store patient-identifying data. Local browser data can be cleared; export regular backups.

## Version 0.3: reviewed document imports

On Import, paste text or load a local `.txt`/`.md` file. Choose **Review batch import** to edit titles, regions, conditions, and source text before saving. Optionally split Markdown level 1–2 headings into entries. No clinical classification, dosage, or treatment facts are generated.

Each entry defaults to skipping an existing title/region match. You can explicitly create a separate entry or append imported text to one matching entry. Ambiguous multiple matches cannot be merged. Confirmation summarizes writes; the batch commits in one storage transaction. Merges preserve existing structured fields and retain appended source history. Imports are marked unreviewed, with document title, source URL, import time and available local file modification time. JSON backups preserve these fields.

`npm run build` checks syntax. `npm run test:unit` runs dependency-free parser/provenance tests. `npm run test:browser` needs Python Playwright and Chromium; it verifies the browser workflow. There is no bundling step. The Pages workflow packages `import-tools.mjs` along with the app shell.

Google OAuth/Drive selection, DOCX extraction, and remote document re-sync remain deferred. Google account import will need an OAuth client ID and authorized origin configuration; pasted Google Docs text works without an account connection.

## Version 0.4: DOCX and Google Docs

Import `.docx` alongside text/Markdown files. Extraction runs locally using bounded ZIP decompression and XML parsing: headings, paragraphs, list text, and tables become reviewable text. The 5 MB archive and 8 MB document XML limits reject oversized, encrypted, malformed or damaged files. Images, macros, links, and external entities are not executed or fetched. Exact Word formatting, list numbering, comments, footnotes and images are not imported. DOCX requires a browser supporting `DecompressionStream('deflate-raw')`; otherwise export your document as text. Local DOCX import works offline after the app shell has been cached.

Optional Google Docs connection uses a public web OAuth client ID, restricted Picker API key, and numeric project number. Enter them under Import → Google connection setup. See [GOOGLE_SETUP.md](GOOGLE_SETUP.md) for exact steps. The app requests only `drive.file`, lets you browse folders and select up to 10 Google Docs, preserves per-document provenance, and opens drafts for review. Tokens remain in memory; Disconnect revokes the active token. No files are modified in Google Drive. Whole-folder ingestion and automatic re-sync remain deferred.

The Google workflow is covered by mock authentication/Picker/API browser checks, not a verified live OAuth session. Configure your project values and complete the live-account checklist before relying on the connection. The application remains usable without Google setup.
