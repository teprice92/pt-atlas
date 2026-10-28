# PT Atlas — Clinical knowledge, anywhere.

An offline-first, installable personal library of physical therapy interventions, protocols, precautions and notes, organized by **body region → condition → interventions**. It is a clinical knowledge organizer, not a patient record or a treatment recommendation system. No clinical content, protocols or dosages are generated or seeded.

Target URL once Pages is enabled: https://teprice92.github.io/pt-atlas/

## Version 1.0: Google Drive sync across devices

Settings → **Sync across devices** keeps the library the same on every device where you turn it on. There is no PT Atlas server and no extra account: the library is stored as one file, plus one file per attachment, in the **hidden app folder** of your own Google Drive (`drive.appdata` permission). Only PT Atlas can read that folder, and it counts toward your Drive storage.

- **How merging works.** Each device remembers the version it last synced. On each sync it compares its copy, the Drive copy and that version, so it knows which side changed what. Changes from different devices combine, deletions carry over, and an edit beats a deletion of the same entry. If two devices edited the same entry, the newer edit wins and the other version is saved in that entry's revision history, where Restore brings it back.
- **When it runs.** Turning sync on uploads or merges immediately. While connected to Google, edits sync a few seconds after you save, every 5 minutes, and when the device comes back online. Edits made offline are simply merged on the next sync. Sign-in lasts for the browser session; after a restart, the sync pill shows "connect Google to resume" and **Sync now** reconnects. Background sync never redraws a form you're typing in.
- **Starter conditions** created on each device are merged rather than duplicated. Custom regions with the same name are combined.
- **Turn off sync** stops syncing on that device and keeps both copies. Turning it back on later merges the two copies without deleting anything, so an entry deleted on another device in the meantime can reappear here. **Remove synced copy from Google Drive** deletes the app-folder files.
- Settings (theme, Google project) stay per device. Patient-identifying information must still never be stored.

## Version 0.9: label matching for imports (no AI)

Imports can fill structured fields straight from the labels already in your documents. This is plain pattern matching that runs on your device: no AI or LLM, no API key, and nothing is sent anywhere. It is on by default and can be switched off at the top of the Import page; the choice is remembered.

**Label forms recognised**

| In your document | Becomes |
|---|---|
| `Dosage: 3 x 10` (also `**Dosage:**` or `- Dosage:`) | Dosage is "3 x 10". Indented or list lines directly below are included. |
| `Precautions:` on its own line, followed by text | Every line until the next blank line |
| A heading such as `### Setup` (Google: Heading 3) | Everything until the next heading of the same or higher level |
| A two-column table row: `Dosage` \| `3 x 10` | That row's value |

**Labels and their fields** (case and punctuation don't matter)

- Clinical purpose: purpose, goal(s), indication(s), target impairment, rationale, objective(s), aim(s)
- Setup & positioning: setup, position, positioning, patient/starting position
- Instructions: instructions, steps, procedure, technique, how to, directions, method, execution, cues, description
- Dosage: dosage, dose, sets, reps, sets and reps, frequency, parameters, prescription, volume, duration, intensity
- Equipment: equipment, materials, supplies, tools
- Progressions & regressions: progression(s), regression(s), modifications, variations
- Precautions & contraindications: precaution(s), contraindication(s), cautions, warnings, red flags, safety, restrictions
- Evidence & references: source(s), reference(s), evidence, citation(s), bibliography
- Tags: tags, keywords · Condition: condition, diagnosis, Dx · Intervention type: type, category (only if it matches a listed type)

Anything without a recognised label stays in Notes, word for word. The review screen shows every matched field, so you can edit or clear anything before saving. With **Split headings into entries**, use level 1–2 headings for interventions and level 3 headings or label lines for fields. The original document text is kept with each entry, so Google re-sync can re-match fields and can tell your own edits apart from changes in the document.

## Version 0.8: Google account and Docs re-sync

- **Site-wide Google setup.** Fill in the three public values in `site-config.mjs` once (see [GOOGLE_SETUP.md](GOOGLE_SETUP.md)) and every visitor can sign in with Google, with no per-browser setup. They stay blank until you have a Google Cloud project, and Google features stay off until then. A browser can still use its own project.
- **Google account panel** in Settings: connect, reconnect without a second consent screen, disconnect and revoke. It only uses the selected-files `drive.file` permission, and tokens are never stored.
- **One-way re-sync.** "Check imported Docs for updates" compares linked documents with Drive and shows a line diff for each changed entry. You choose skip (the default, offered again next time), replace or append, and can add new sections as entries. Removed sections never delete anything, replaced text stays in revision history, and edited entries warn before replacement.
- **Picker selection raised to 25 documents.** Select the documents inside a folder. Whole-folder reads would need Google's restricted Drive scope, which this app deliberately avoids.
- Imports now keep the original imported text (`sourceText`), so re-sync can tell your edits apart from changes in Google.
- No AI or LLM is involved anywhere in import or sync, and no API keys besides your own public Google values.

## Version 0.7: navigation fix, custom regions, formatted notes and attachments

- **Home link.** The PT Atlas logo and name, in the desktop sidebar and the mobile top bar, now link to Home.
- **Custom body regions.** Settings → Body regions adds your own specialties, such as Pelvic Health or Pediatrics. They appear everywhere the standard ten do: library tiles, editors, filters and deep links. Renaming a custom region updates every condition and intervention in it. A region can only be deleted once nothing uses it. The standard regions stay fixed so backups remain compatible.
- **Formatted notes.** Text fields render a safe Markdown subset: `#` headings, `-` and `1.` lists, `**bold**`, `_italic_`, `` `code` `` and `[label](https://…)` links. All text is HTML-escaped first, raw HTML is never rendered, and only http/https links are allowed (they open in a new tab with `noopener`). Imported documents, which already use `#` and `-`, now display with structure.
- **Attachments.** Add images (PNG, JPEG, GIF, WebP) and PDFs, up to 10 MB each, to any intervention. The file type is taken from the file's bytes, not its name or reported type, so SVG, HTML and disguised files are refused. Attachments are stored on the device, open in a new tab, print with collections, and are included in backups as base64. Deleting an intervention keeps its attachments so a restore brings them back. Settings shows attachment storage and can purge attachments that belong to deleted entries.
- **Storage schema v3** (adds `regions` and `media`) with an in-place upgrade. **Backup format v3**, and v1/v2 backups still import. Restored custom regions are matched by name, so they aren't duplicated.

## Version 0.6: knowledge management (Milestone 3)

- **Condition links (many-to-many).** Link one intervention to any number of conditions, each with its own condition-specific dosage, restrictions and notes. The intervention is never duplicated. Condition pages list both primary and linked interventions, with the link context shown.
- **Structured protocol phases.** Each condition's Protocols tab holds ordered phases. A phase records a name, timeframe, objectives, restrictions and precautions, criteria to progress, linked interventions, source and source date. Phases can be reordered. Existing free-text protocol notes are kept and shown under the phases. Nothing is pre-filled: phases are entered from the treating provider's protocol.
- **Revision history.** Each edit keeps the previous version, up to 25 per entry. Earlier versions can be restored from the detail page or the condition Overview tab. Deleting an intervention or condition records a snapshot, including its links and phases, so it can be restored from Settings → Recently deleted.
- **Collections.** Ordered, printable sets of interventions (Collections in the sidebar, or from Library). Add items from any intervention page and reorder them. Print gives a clean handout without app chrome, and holds no patient information.
- **Review indicators.** A "Review due" badge and filter appear when a reviewed entry hasn't been re-reviewed in 12 months. The home "Need review" stat opens the review queue.
- **Search.** Results are ranked (title matches first), and condition-link text and protocol phases are searched. Matches are highlighted.
- **Storage schema v2** with an in-place upgrade from v1. **Backup format v2** includes links, phases, collections and revisions, and version 1 backups still import. When a backup is restored into a fresh install, empty starter conditions with the same name are replaced. A same-named condition that has content stops the import, and nothing is changed.

## Version 0.5: redesign, routing and knowledge-management polish

**Brand.** A new original mark: a summit-shaped "A" in the brand blue→teal gradient, with a column of vertebrae in its open interior that widen toward the base (a spine motif). Shipped as `icon.svg` plus PNG app icons (`icons/`, including a maskable icon and an Apple touch icon).

**Design.** An editorial system influenced by premium product and publishing sites without copying either:
- Apple-style calm: system San Francisco/Segoe type, large tightly tracked headlines, generous whitespace, frosted translucent top and tab bars, pill buttons, segmented controls and soft elevated cards.
- Verge-style energy: a dark hero with topographic contour lines and gradient type, monospace uppercase kickers with colored slashes, numbered "Latest" stream, big-number stat strip with colored rules, and a per-region accent color.
- Light, dark and **System** themes using the brand palette (`#101827`, `#F7F9FC`, `#527DFF`, `#18A999`) with AA-contrast text tokens. The collapsible desktop sidebar is remembered. The mobile bottom tab bar respects safe areas. Visible focus, a skip link, reduced-motion and forced-colors support are included.
- No web fonts or third-party requests (the earlier Google Fonts import was removed).

**Features added.**
- Condition pages use six accessible tabs (Overview, Precautions, Protocols, Interventions, Evidence, Notes) with arrow/Home/End keyboard support. The Protocols tab states that surgical protocols depend on the treating surgeon/provider.
- Filters for region, intervention type, review status, source (imported vs authored) and favorites, available in the library and in search.
- New intervention fields: setup & positioning, author, review status (Draft / Needs review / Reviewed) and last-reviewed date (auto-filled when marked reviewed). Imported and unreviewed entries carry visible badges.
- Hash routing (`#/library`, `#/region/Hip`, `#/condition/…`, `#/intervention/…`): refresh, back/forward and deep links work on GitHub Pages without a server fallback.
- Storage panel: usage/quota estimate, persistent-storage request ("Protect local data") and a status pill showing persistence and offline-cache state.
- Keyboard: `/` or Ctrl/⌘-K focuses search; Escape clears it.

## Run locally

```bash
python3 -m http.server 8080   # from the parent folder, then open http://localhost:8080/pt-atlas/
```

Service workers need localhost or HTTPS, so do not open `index.html` from the file system.

## Checks

- `npm run build`: syntax-checks every module.
- `npm run test:unit`: parser, DOCX, Google-mapping, provenance, backup-validation, search-ranking, review-due, Markdown-safety, attachment-sniffing, label-matching, two-device sync and app-shell tests. The shell tests check that every cached and manifest asset exists, that paths are relative, that there are no third-party URLs, and that the Pages workflow publishes every file.
- `npm run test:browser`: eight Playwright suites (`smoke.py`, `import-browser.py`, `features-browser.py`, `knowledge-browser.py`, `content-browser.py`, `google-sync-browser.py`, `mapping-browser.py`, `sync-browser.py`). They need Python Playwright and Chromium. If Chromium is not on `PATH`, set `PT_ATLAS_CHROMIUM` to its executable.

---

## Earlier release notes

## Still deferred

- A live Google account has not been tested (mocked in CI). One-click whole-folder import is intentionally not supported (see GOOGLE_SETUP.md).
- Shared multi-user libraries (would need a backend such as Supabase). Personal sync uses Google Drive; the app never requires an account.
- Renaming or hiding the ten standard body regions; image annotation and video attachments.
- Safari/iPhone install testing on a physical device.

**Important:** This is a personal knowledge organizer, not a validated clinical decision-support system. No clinical instructions are seeded. Verify protocols against patient-specific orders. Do not store patient-identifying data. Local browser data can be cleared, so export regular backups.

## Version 0.3: reviewed document imports

On Import, paste text or load a local `.txt`/`.md` file. Choose **Review batch import** to edit titles, regions, conditions, and source text before saving. Optionally split Markdown level 1–2 headings into entries. No clinical classification, dosage, or treatment facts are generated.

Each entry defaults to skipping an existing title/region match. You can explicitly create a separate entry or append imported text to one matching entry. Ambiguous multiple matches cannot be merged. Confirmation summarizes writes; the batch commits in one storage transaction. Merges preserve existing structured fields and retain appended source history. Imports are marked unreviewed, with document title, source URL, import time and available local file modification time. JSON backups preserve these fields.

`npm run build` checks syntax. `npm run test:unit` runs dependency-free parser/provenance tests. `npm run test:browser` needs Python Playwright and Chromium; it verifies the browser workflow. There is no bundling step. The Pages workflow packages `import-tools.mjs` along with the app shell.

Google OAuth/Drive selection, DOCX extraction, and remote document re-sync remain deferred. Google account import will need an OAuth client ID and authorized origin configuration; pasted Google Docs text works without an account connection.

## Version 0.4: DOCX and Google Docs

Import `.docx` alongside text/Markdown files. Extraction runs locally using bounded ZIP decompression and XML parsing: headings, paragraphs, list text, and tables become reviewable text. The 5 MB archive and 8 MB document XML limits reject oversized, encrypted, malformed or damaged files. Images, macros, links, and external entities are not executed or fetched. Exact Word formatting, list numbering, comments, footnotes and images are not imported. DOCX requires a browser supporting `DecompressionStream('deflate-raw')`; otherwise export your document as text. Local DOCX import works offline after the app shell has been cached.

Optional Google Docs connection uses a public web OAuth client ID, restricted Picker API key, and numeric project number. Enter them under Import → Google connection setup. See [GOOGLE_SETUP.md](GOOGLE_SETUP.md) for exact steps. The app requests only `drive.file`, lets you browse folders and select up to 10 Google Docs, preserves per-document provenance, and opens drafts for review. Tokens remain in memory; Disconnect revokes the active token. No files are modified in Google Drive. Whole-folder ingestion and automatic re-sync remain deferred.

The Google workflow is covered by mock authentication/Picker/API browser checks, not a verified live OAuth session. Configure your project values and complete the live-account checklist before relying on the connection. The application remains usable without Google setup.
