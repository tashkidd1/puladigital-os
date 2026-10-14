# Pula Digital OS

Pula Digital OS is a private internal operations workspace for leads, clients, website projects, outreach, follow-ups, research verification, and QA readiness.

## MVP status

The MVP is implemented with React, Vite, and TypeScript. It includes the Ops Ledger dashboard, lead CRM, client workspace, project delivery board, outreach log, follow-up calendar, research verification queue, QA checklist, Supabase Auth/database seams, a representative seed dataset, and Netlify build configuration.

The initial seed is imported from the authoritative `pula-digital` repository in a separate read-only clone. Existing repository files and the original GitHub repository were not modified. `src/data/seed.ts` contains normalized lead, outreach, project, research, follow-up, client-workspace, and QA records; `src/data/importer.ts` is the single import boundary for future updates.

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Without Supabase variables, the app runs in clearly labeled demo mode so the workflows can be reviewed safely. With Supabase variables present, it requires email/password authentication and attempts to load workspace records from the configured tables.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor after reviewing the internal-team RLS policy.
3. Configure email/password users in Supabase Auth.
4. Add the browser-safe values to Netlify environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Normalize the repository export to the schema and load team profiles first, then clients/leads, projects, and activity records. Do not use a service-role key in the browser.

## Netlify

`netlify.toml` is ready for a Vite static build, SPA fallback, and baseline security headers. The build command is `pnpm install --frozen-lockfile && pnpm build`, with `dist` as the publish directory.

## Validation

```bash
pnpm check
pnpm build
```
