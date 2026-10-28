# PT Atlas delivery — version 0.8

## Version 0.8 summary

Google sign-in and Drive infrastructure are ready for your credentials. Put the client ID, API key and project number in `site-config.mjs` (steps in GOOGLE_SETUP.md). Added a Settings → Google account panel and a reviewed one-way re-sync of imported Google Docs with line diffs. Picker selection is raised to 25. Verified locally against mocked Google services: `npm run build`, 32 unit tests and six Playwright suites. A live Google account still needs to be checked once the project exists.

## Version 0.7 notes

Fixed the logo/name not linking Home. Added custom body regions, safe Markdown formatting in notes, and image/PDF attachments sniffed by content. IndexedDB schema v3 and backup format v3 add regions and media, and older databases and backups still load. Verified locally: `npm run build`, 28 unit tests, and all five Playwright suites passed.

## Version 0.6 notes

Milestone 3 knowledge management: many-to-many condition links with condition-specific details, structured protocol phases, revision history with restore and recovery of deleted entries, printable collections, review-due indicators, and ranked search. IndexedDB schema v2 upgrades v1 in place. Backups are now version 2, and version 1 backups still import. Verified locally: `npm run build`, 24 unit tests, and all four Playwright suites passed.

## Version 0.5 notes


Redesigned brand mark and interface (see README), condition tabs, filters, new review/setup fields, hash routing, storage-persistence status, and removal of third-party font requests. Verified locally in this session: `npm run build`, 18 unit tests, and all three Playwright suites (smoke, import, features) passed against the bundled Chromium. Previous version notes follow.

## Version 0.4 notes

The supplied starter and implementation plan are preserved. The working feature branch contains a responsive, local-first library with intervention/condition CRUD, notes and protocol text, favorites, search, IndexedDB persistence, JSON backups, and a scoped offline app shell.

## Document imports

- Local text, Markdown, and DOCX imports run on-device. DOCX extraction handles paragraphs, heading styles, list text, and tables, with archive/XML size limits, checksum validation, and rejection of encrypted or unsafe content. Exact formatting, numbering, images, comments, footnotes, and scanned text are not extracted.
- Batch review supports heading splitting, editable fields, explicit duplicate skip/create/append decisions, atomic saves, unreviewed labels, and source history.
- Optional Google sign-in and Picker use the selected-file `drive.file` scope. The integration only performs reads. Users can browse folders and select up to 10 native Google Docs; whole-folder ingestion is not implemented.
- Google imports retain per-document source URLs, stable document IDs, titles, modified timestamps, and import times. Tokens remain in memory and never enter local storage or backups. Google scripts load only after an explicit connection click.
- Public configuration fields are available in Import → Google connection setup. See [GOOGLE_SETUP.md](GOOGLE_SETUP.md) for exact API, OAuth, key restriction, and live-account verification steps. No live OAuth account was tested: the owner chose to configure their Google project later.

## Verification

Implementation commit `20d0acb566ec92b1c5945f798356ffc48712d7d5` passed GitHub Actions run [40762456346](https://github.com/teprice92/pt-atlas/actions/runs/40762456346), including syntax checks, 14 unit cases, and both Playwright suites. Coverage includes CRUD, backups, persistence, offline reload/CRUD, mobile overflow, document review, duplicate handling, DOCX extraction and invalid inputs, offline DOCX, and mocked Google setup, denial, popup cancellation, Picker cancellation, API denial, multi-document provenance, token privacy, and disconnect. Local server sockets are blocked in the managed sandbox, so browser suites ran in CI. A later documentation-only update corrects the API-key referrer example and these delivery notes.

## GitHub Pages

1. Review and merge PR #1 into main.
2. In repository Settings → Pages → Build and deployment → Source, choose GitHub Actions.
3. In Actions → Verify and deploy Pages, run the workflow on main if needed.
4. Wait for verify and deploy to succeed; check https://teprice92.github.io/pt-atlas/ on desktop and mobile, reload, then test offline after caching completes.

The app uses relative assets under `/pt-atlas/`. New JavaScript modules are included in both the service-worker shell and Pages artifact. The PR is not merged and no live deployment is claimed.

## Remaining work

Real-account Google verification after configuration; whole-folder ingestion and reviewed document re-sync; optional cloud sync; editable region taxonomy; many-to-many intervention links; structured protocol entities; revision history; Safari/iPhone and installation checks. Local browser data is not synced: export backups regularly and do not store patient-identifying information.
