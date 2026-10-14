# Pula Digital OS MVP — Delivery Outcomes

## 1. Private internal workspace shell
- [x] The MVP is a private internal operations web application with responsive dashboard navigation across leads, clients, website projects, outreach, follow-ups, research verification, and QA.
- [x] The application is implemented with React, Vite, and TypeScript.
- [x] The visual system follows the approved Ops Ledger direction: information-dense but calm, IBM Plex Sans, Pula Ink navy, amber action accents, ruled operational surfaces, and explicit status signals.
- [x] The app includes a clear demo-mode boundary when Supabase is not configured; it does not pretend demo data is authenticated private data.

## 2. Supabase-ready private access and persistence
- [x] Supabase authentication is supported through browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
- [x] The application includes a Supabase schema for users/records, relationships, timestamps, row-level security starter policies, and an additive import path without committing secrets.
- [ ] Production access must be connected to the team’s Supabase project and verified with authorized internal users before the app is treated as live-private.

## 3. Lead CRM
- [x] The lead CRM supports viewing, searching, filtering, creating, editing, organizing, and tracking leads through their current status.
- [x] Lead rows surface company, contact, owner, stage, source, value, next action, and next-action date.
- [x] The lead detail drawer supports stage and owner updates plus a next-action note.

## 4. Client workspace
- [x] Client records are maintained in a dedicated module.
- [x] Selecting a client surfaces related projects, outreach, follow-ups, research, and QA activity.
- [x] Client health and current relationship signals are visible without requiring a separate deep navigation path.

## 5. Website project management
- [x] Website projects track project details, status, ownership, milestones, and client relationships.
- [x] The projects module exposes delivery status, next milestone, owner, client, and readiness.
- [x] Project detail actions provide a clear path to QA readiness.

## 6. Outreach tracking
- [x] Outreach attempts record channel, date, outcome, and lead or client association.
- [x] The outreach module supports filtering by channel and outcome and logging a new outreach record.
- [x] Recent outreach is visible in the dashboard activity stream.

## 7. Follow-up calendar
- [x] Dated follow-up tasks connected to leads, clients, and projects are visible in a follow-up calendar/agenda.
- [x] Users can move through dates, view overdue/upcoming tasks, and mark follow-ups complete.
- [x] Dashboard and calendar surfaces share the same follow-up records.

## 8. Research verification
- [x] Research findings capture source URL, verification status, confidence, reviewer notes, and associated entity.
- [x] The research queue supports review-state filtering and a focused verification action.
- [x] Unverified and needs-review findings are surfaced as operational signals.

## 9. QA checklist
- [x] Website projects expose QA checklist items with completion state and issue notes.
- [x] QA readiness is summarized as a completion meter and status.
- [x] A project can be marked ready when its checklist is complete, while open issues remain visible as evidence.

## 10. Import and deployment handoff
- [x] The initial dataset is isolated behind a typed seed/import adapter so a repository export can be imported without changing the existing repository files.
- [x] The authoritative `pula-digital` repository was cloned into a separate read-only folder; 19 current lead records, dated outreach states, canonical project paths, supplied demo URLs, research verification items, and QA-ready project records were normalized into the MVP seed.
- [x] Existing repository files and the original GitHub repository were not modified.
- [x] Netlify build configuration and SPA fallback are included.
- [ ] The imported records must be loaded into the team’s Supabase project using the included schema/import seam once the project credentials are available.
