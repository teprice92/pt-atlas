# PT Atlas delivery

The original starter and implementation plan are recovered in this repository. Version 0.2 adds ten region categories, condition notes, text/Markdown file import into an editable draft, atomic validated JSON merge with overwrite counts, condition rename link preservation, immediate deletion refresh, accessible field labels, scoped service-worker cache cleanup, and truthful cache readiness status.

## Verification

`npm run build` passes JavaScript syntax checks; this static application needs no bundling. `npm test` runs the Playwright browser suite. Install its test dependency with `pip install playwright` and `python -m playwright install chromium` (or use system Chromium). The local managed sandbox blocked server socket creation, so browser tests have been added but have NOT been verified passing locally. CI runs the suite on pull requests and main.

## GitHub Pages

1. Review the feature pull request and its Actions checks, then merge it into main.
2. Open repository Settings → Pages → Build and deployment → Source, select GitHub Actions.
3. Open Actions → Verify and deploy Pages. Run workflow on main if needed.
4. Wait for both verify and deploy jobs to succeed. Check the deployment URL https://teprice92.github.io/pt-atlas/ on desktop and phone, reload it, and test offline reload after the service worker takes control.

No live deployment is claimed. GitHub Pages settings were not changed through the connector. Relative assets and the browser suite use the /pt-atlas/ subpath.

## Remaining work

Local-only IndexedDB data: export backups regularly; no patient-identifying information. No Google account integration, DOCX extraction, cloud sync, editable body-region taxonomy, multi-condition links, rich protocol phase entities, or review history yet. Condition protocols and notes are editable text. The included suite covers intervention CRUD, favorites, condition rename and notes, reload persistence, backup round-trip, malformed import rejection, search, paste review, offline CRUD/reload, mobile overflow, and browser errors. Broader Safari/iPhone and installability checks remain necessary.

## Version 0.3 update

Structured batch text/Markdown review, explicit duplicate decisions, source provenance and merge history are now implemented. The version 0.2 browser suite passed in GitHub Actions run 40757275901. Six version 0.3 parser/provenance unit cases pass locally; the expanded browser suite awaits CI. Google OAuth and DOCX extraction remain pending.
