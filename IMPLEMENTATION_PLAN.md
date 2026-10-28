# PT Atlas — Codex Implementation Plan

**Project:** PT Atlas — “Clinical knowledge, anywhere.”  
**Repository:** https://github.com/teprice92/pt-atlas  
**Deployment target:** https://teprice92.github.io/pt-atlas/  
**Status:** Implementation brief for Codex, 2026-10-28

## Instructions for Codex

You have GitHub write access. Implement this project in the `teprice92/pt-atlas` repository, preferably on a feature branch with a pull request (or commit to `main` if instructed by the user). Do not stop after writing a plan: **create and commit functioning application code**, verify the build, and configure GitHub Pages deployment as far as permissions allow.

**Important:** A prior working prototype is available as `pt-atlas-fixed.zip` in the ChatGPT conversation. If this file is attached to your Codex task or available in the workspace, inspect and use it as a starting point. If unavailable, build the app from this specification. Do not assume the ZIP has been uploaded to GitHub. The prototype is a static vanilla JS app with `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icon.svg`, and `README.md`. It has not been fully browser-tested; address any blank-screen issues.

### Immediate acceptance criteria (Milestone 1)
1. Repo contains a functional responsive application, not just mockups or documentation.
2. GitHub Pages deploys the app successfully under `/pt-atlas/` with no blank screen, broken JS/CSS paths, or routing errors.
3. On desktop and mobile, users can browse body regions and conditions, create/edit/delete interventions, search, favorite, and view/edit condition notes, precautions and protocols.
4. Entries persist locally after refresh and can be exported/imported as JSON.
5. App loads offline after first successful online visit; clearly displays online/offline and data persistence status.
6. Include a meaningful starter taxonomy, but **do not invent clinical protocols or treatment dosages**.
7. Add tests for essential CRUD, import/export, and persistence behavior. Run the tests and report results.
8. Document how to enable GitHub Pages and verify the public URL. If repository settings cannot be changed through Codex, provide exact remaining user steps.

## Product vision

An offline-first, premium, personal physical therapy intervention knowledge library. It is a **clinical knowledge organizer**, not a patient record or autonomous treatment recommendation system. Users build a reusable library organized by **body region → diagnosis/condition → interventions/protocols/precautions/notes/references**. Content must be user-editable and linked to source evidence.

Target devices: Android phone, iPhone, desktop browser, and installable PWA. Start single-user/local-first, with optional cloud sync later.

## Brand and design

- Name: **PT Atlas** (short name **ATLAS**).
- Tagline: **Clinical knowledge, anywhere.**
- Premium editorial design inspired by Apple’s minimalism and The Verge’s visual energy, without copying either.
- Colors: deep navy `#101827`, ink `#111827`, light canvas `#F7F9FC`, white `#FFFFFF`, blue `#527DFF`, teal `#18A999`; accessible contrast and coherent dark/light themes.
- Mountain-like stylized **A** logo with subtle anatomy/spine motif. A prior generated brand concept exists in the conversation; use supplied image assets only if available and appropriately licensed. Otherwise use a clean original SVG icon.
- Responsive: collapsible desktop sidebar, global search, body-region cards, contextual detail panel; mobile bottom navigation, touch-friendly controls, excellent typography and whitespace.
- Accessibility: semantic controls, labels, keyboard navigation, visible focus, reduced-motion support, sensible empty/loading/error states.

## Information architecture

### Body regions / specialties
Hip, Knee, Shoulder, Spine, Ankle & Foot, Elbow/Wrist/Hand, Neurologic, Cardiopulmonary, Vestibular, and an extensible “Other” category.

### Conditions
Example **organizational labels**, not clinical guidance:
- Hip: Total Hip Arthroplasty, Femoroacetabular Impingement, Osteoarthritis, Greater Trochanteric Pain Syndrome
- Knee: Total Knee Arthroplasty, ACL Reconstruction, Patellofemoral Pain
- Shoulder: Rotator Cuff Repair, Adhesive Capsulitis
- Spine: Low Back Pain, Cervical Radiculopathy
- Ankle/Foot: Lateral Ankle Sprain, Achilles Tendinopathy
- Neuro: Stroke, Parkinson Disease
- Vestibular: BPPV
All categories and conditions should be editable/expandable.

### Condition page tabs
1. Overview / clinical summary
2. Precautions & contraindications
3. Rehab protocols / phases / progression criteria
4. Linked interventions
5. Evidence / references
6. Personal notes

### Intervention fields
- ID, title, description, type/category
- Associated body region(s) and condition(s) (many-to-many)
- Purpose / target impairment
- Equipment
- Setup, positioning, steps / instructions
- Dosage (user-entered, no invented defaults)
- Progressions / regressions
- Precautions, restrictions and contraindications
- Condition-specific notes/dosage/restrictions on the **link**, rather than duplicating intervention records
- Attachments / media references
- Citations, source links, author, created/updated/reviewed dates
- Tags, favorites, custom collections, review status

### Protocols
Represent phases as user-authored content with objectives, restrictions, criteria to progress, source, date, and optional links to interventions. Make it clear that surgery-specific instructions depend on the actual surgeon/provider protocol.

## Core features

**Library:** CRUD for body regions (if feasible), conditions, interventions, protocols, notes and references; linking interventions to multiple diagnoses; tags and favorites.

**Search:** fast search across titles, conditions, body regions, descriptions, tags and notes; filters by region, diagnosis, type, favorite and source.

**Google Docs import — phased:**
- Milestone 1: support **paste text** and import local `.txt`, `.md` and ideally `.docx` files through a reviewable draft. Do not claim Google Docs account integration exists if it does not.
- Milestone 2: Google OAuth/Drive picker, select Google Docs or folders, read documents using minimally scoped permissions, extract headings/lists/tables, suggest structured classification, show a review screen, de-duplicate and merge with user approval. Preserve source URL, title, modified time, imported time and provenance.
- Later: optional one-way re-sync from Google Docs with diff/review and no silent overwrites.
- Any AI classification must be labeled as a suggestion and **must not fabricate clinical facts**.

**Backup:** JSON export/import, validation, duplicate handling, import preview and a clear warning before replacing existing data.

**Offline:** PWA service worker caching the application shell; local data in IndexedDB (Dexie recommended if using React); offline CRUD/search and queued writes if cloud sync exists; storage quota and cache status feedback; app must work when network is unavailable after initial install.

**Sync (later):** optional Supabase Auth, Postgres, Storage and row-level security. Local-first conflict resolution, retry queues, device sync and revision history. Never require a cloud account for basic offline use.

## Suggested technical architecture

For the full product, prefer:
- React + TypeScript + Vite
- Tailwind CSS or well-structured CSS
- React Router (ensure GitHub Pages fallback / hash routing if needed)
- Dexie + IndexedDB
- Vite PWA plugin / Workbox
- TipTap for rich notes if needed
- Vitest + React Testing Library, Playwright for smoke tests
- Optional Supabase later

If reusing the vanilla JS prototype for the initial GitHub Pages release, that is acceptable **provided it passes the acceptance criteria**. Avoid an unnecessary rewrite before shipping a reliable MVP.

Recommended entities/tables: `body_regions`, `conditions`, `interventions`, `condition_interventions`, `protocols`, `precautions`, `references`, `media`, `tags`, `collections`, `favorites`, `revisions`, `import_jobs`, `source_documents`. Include versioned schema migrations and stable IDs.

## GitHub Pages deployment

- Repository: `teprice92/pt-atlas` (public).
- Target URL: `https://teprice92.github.io/pt-atlas/`.
- Ensure `base: '/pt-atlas/'` in Vite or use relative `./` paths for static assets.
- For SPA routing, use hash routing or appropriate Pages fallback.
- Preferred: `.github/workflows/deploy.yml` using GitHub Actions Pages deployment. Alternatively, deploy from `main` root for a no-build static app.
- Ensure workflow permissions are appropriate (`contents: read`, `pages: write`, `id-token: write` for Pages Actions deployment).
- Verify that the published HTML references real assets, service-worker scope is correct, and direct navigation/refresh works.
- Do not claim the site is live until deployment has succeeded.

## Clinical safety and privacy requirements

- This is not medical advice or an autonomous prescribing tool.
- Never auto-generate unverified restrictions, progression criteria or exercise dosage.
- Store author/source/review dates; visually distinguish imported/unreviewed material.
- Provide a reminder that clinician judgment and patient-specific instructions govern treatment.
- Do not store patient-identifying information in this MVP.
- No analytics, third-party trackers or unneeded external dependencies by default.
- When cloud services are added, review privacy, security, access controls and applicable compliance requirements before using patient data.

## Delivery roadmap

### Milestone 1 — Deployable offline MVP (do this now)
- Repository initialization and working app
- Responsive ATLAS branding
- Region → condition navigation
- Intervention editor, favorites, notes, precautions, protocol placeholders
- Search and local persistence
- Backup export/import
- Installable PWA and offline caching
- GitHub Pages setup and smoke tests

### Milestone 2 — Import workflows
- Structured text / DOCX import
- Google Docs connection via OAuth
- Batch import and review UI
- Source provenance and duplicate detection

### Milestone 3 — Knowledge management polish
- Intervention-condition many-to-many links with contextual restrictions
- Rich text, tags, collections, evidence library
- Revision history, content review indicators
- Better full-text search and filters

### Milestone 4 — Optional cloud sync
- Supabase auth/storage/database and RLS
- Device synchronization, conflicts, revision backups
- Offline write queue and recovery testing

### Milestone 5 — Advanced capabilities
- Optional media attachments, cached downloads
- Shared libraries with roles/permissions
- AI-assisted extraction/classification **with human approval**
- Accessibility, performance and security hardening

## What Codex should report when finished

Provide:
1. GitHub commit / PR link and files changed.
2. Live GitHub Pages URL **only if verified deployed**.
3. Features implemented and features deferred.
4. Tests/build commands run and results.
5. Any required one-time GitHub settings or Google API credentials.
6. Known limitations, especially local-only data and incomplete Google Docs integration.

**Priority:** Get a real, polished, nonblank, usable PT Atlas MVP online first. Then iterate toward the full vision.
