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
