# Pula Digital OS MVP — Implementation Plan

## Product scope
 Pula Digital OS is a private internal operations workspace for one team to manage leads, clients, website projects, outreach, follow-ups, research verification, and QA readiness in one place. The app is being built as a React + Vite + TypeScript web app with a Supabase-ready authentication/database integration surface and Netlify deployment files. The authoritative `pula-digital` GitHub repository was cloned into a separate read-only folder for import; its files and remote history were not modified.

## Implementation approach
- Use a typed client-side MVP with a small data-access layer. The UI works in demo mode with the bundled seed dataset when Supabase variables are absent, and switches to Supabase tables when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present.
- Use React state for the current MVP interactions: filters, search, tabbed modules, drawer forms, status updates, checklist toggles, calendar selection, and verification/QA actions. Keep data types and operations in `src/lib` so persistence can move from demo mode to Supabase without rewriting the screens.
- Use Supabase Auth with email/password when configured. The private-workspace gate is explicit in the UI, with a demo-mode indicator rather than silently implying that demo data is private.
- Provide `supabase/schema.sql` with tables, relationships, enums/check constraints, updated-at triggers, and starter import instructions. The schema is additive and does not run automatically against a shared database.
- Provide `netlify.toml` with a Vite build, SPA fallback, and security headers appropriate for an internal app. No secret is committed.
- Provide `public/manus-routes.json` for the `/` dashboard entry route.

## Design direction: Ops Ledger

### Alternative styles considered
- **Ops Ledger** (< 0.08): disciplined information-dense workspace inspired by technical ledgers and editorial systems.
- **Copper Terminal** (< 0.06): dark command-center surfaces with warm copper accents.
- **Field Notes** (< 0.05): paper-like research journal with botanical green and clay accents.

### Chosen movement
**Ops Ledger** — an editorial operations console with crisp hierarchy, quiet surfaces, and warm signal colors.

### Core principles
1. **Scan before drill down:** status, ownership, due dates, and next actions appear before metadata.
2. **Editorial hierarchy:** typography and ruled dividers create a calm reading order instead of card-grid noise.
3. **Warm signals, cool canvas:** navy ink anchors trust; amber, teal, and coral carry operational meaning.
4. **Progress is visible:** every module exposes what is active, at risk, or ready for the next handoff.

### Color philosophy
A deep ink navy (#17324D) gives the workspace authority without the harshness of black. Warm amber (#D97706) highlights the next action and adds human energy to a system of records. Soft paper (#F5F3EE) and blue-white panels make long sessions comfortable. Teal and coral are reserved for positive and risk states, so color remains a semantic language instead of decoration.

### Layout paradigm
A fixed left rail frames a wide working canvas. The main surface begins with an editorial masthead, then an operational pulse strip, then a split workspace: high-signal work queues on the left and contextual activity or calendar detail on the right. Module navigation changes the canvas content without losing the global pulse.

### Signature elements
- Small uppercase section labels with generous tracking, like a printed operations ledger.
- A “Today’s pulse” ribbon with compact metric cells and a thin amber progress line.
- Status dots, ruled rows, and compact avatars that make ownership and workflow state legible at a glance.

### Interaction philosophy
Interactions should feel like advancing a shared record: filters are immediate, edits happen in focused drawers, status changes are reversible and visible, and completed work stays present as evidence. The app favors short forms and inline controls over modal-heavy flows.

### Animation
Use restrained 160–220ms transitions for rail selection, drawer entry, tab changes, and row hover. Use a slow ambient motion only for the pulse line; never animate data values or introduce distracting spring physics. Respect reduced-motion preferences.

### Typography system
Use **IBM Plex Sans** for all interface text with strong weight contrast: 12px tracked labels, 14–15px body, 18–22px section titles, and 32–44px page metrics. Use tabular numerals for counts and dates. Keep the wordmark in a heavier IBM Plex Sans weight with a small amber “/” mark.

### Brand essence
**Pula Digital OS is the team’s operating ledger: one private place to turn scattered client work into clear next actions.** Personality: **precise, grounded, quietly ambitious**.

### Brand voice
Headlines are direct and operational: “Keep the next handoff visible.” CTAs are verbs with context: “Add lead”, “Log outreach”, “Mark ready”. Avoid generic onboarding language; microcopy should explain consequence, e.g. “No follow-up should disappear between tabs.”

### Wordmark & logo
A compact wordmark built from “PULA” in bold ink lettering with an amber slash between the first and second syllables; the slash doubles as the visual cue for movement from record to action.

### Signature brand color
**Pula Ink** — #17324D.

## Information architecture
- **Dashboard** `/`: operational pulse, priority queue, follow-up calendar, active project strip, recent activity.
- **Leads**: searchable/filterable CRM table, lead detail drawer, add/edit lead flow, stage and owner controls.
- **Clients**: client list and client workspace view with related projects, outreach, follow-ups, research, and QA signals.
- **Projects**: website delivery pipeline with status, client, owner, next milestone, and readiness.
- **Outreach**: outreach log with channel, outcome, date, and association.
- **Calendar**: follow-up agenda with date selection, overdue/upcoming states, and quick completion.
- **Research**: verification queue with source URL, confidence, status, reviewer notes.
- **QA**: project checklist with completion state, issue notes, and readiness meter.

## Project structure
```text
puladigital/
├── public/
│   └── manus-routes.json       # route declaration for Preview
├── src/
│   ├── components/             # shell, shared UI, drawers, badges, calendar
│   ├── data/                    # typed seed data + importer boundary
│   ├── lib/                     # types, demo store, Supabase adapter, formatters
│   ├── App.tsx                  # module routing and page composition
│   ├── main.tsx                 # Vite entry
│   └── styles.css               # Ops Ledger design system
├── supabase/
│   └── schema.sql               # additive schema and RLS starter
├── .env.example                 # browser-safe Supabase configuration shape
├── app.config.ts                # project logo metadata
├── index.html
├── netlify.toml                 # static build + SPA fallback/security headers
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── vite.config.ts
└── TODO.md
```

## Data boundary
 The source repository is imported into `src/data/seed.ts` through a normalized, typed boundary: 19 current lead records from the lead tracker, dated outreach states from the 12 and 14 October logs, canonical project paths and supplied demo URLs from the record-authority register, verification items for the four URLs whose uptime/CTA checks remain outstanding, and QA-ready records for the four 25 September projects. Historical and unsupported facts are not inferred. `src/data/importer.ts` remains the single replacement seam for future repository exports. The source clone and remote repository were kept read-only.

## Deployment and environment
- `pnpm build` emits `dist/` for Netlify.
- Netlify redirects all non-asset paths to `index.html`.
- Supabase variables are client-safe only: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put a service-role key in the browser or repository.
- Demo mode is clearly labeled and should be disabled for production by configuring Supabase and enforcing internal access through Supabase Auth plus project-level policies.
