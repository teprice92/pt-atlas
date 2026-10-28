# PT Atlas delivery — version 0.4

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
