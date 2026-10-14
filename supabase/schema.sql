-- Pula Digital OS MVP schema
-- Run this migration in the target Supabase project after reviewing policies.

create extension if not exists "pgcrypto";

drop type if exists public.lead_stage cascade;
create type public.lead_stage as enum ('New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost');
drop type if exists public.project_status cascade;
create type public.project_status as enum ('Discovery', 'In build', 'Review', 'Live', 'Paused');
drop type if exists public.research_status cascade;
create type public.research_status as enum ('Unverified', 'Needs review', 'Verified');

table if not exists public.team_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text default 'Team member',
  avatar text,
  created_at timestamptz not null default now()
);

table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  industry text,
  email text,
  health text not null default 'Healthy' check (health in ('Healthy', 'Watch', 'At risk')),
  owner_id uuid references public.team_profiles(id),
  since date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  role text,
  email text,
  location text,
  source text,
  stage public.lead_stage not null default 'New',
  owner_id uuid references public.team_profiles(id),
  value numeric(12,2) not null default 0,
  next_action text,
  next_action_date date,
  last_touched date,
  avatar text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  client_id uuid references public.clients(id) on delete set null,
  status public.project_status not null default 'Discovery',
  owner_id uuid references public.team_profiles(id),
  next_milestone text,
  milestone_date date,
  readiness integer not null default 0 check (readiness between 0 and 100),
  description text,
  accent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

table if not exists public.outreach (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  company text not null,
  contact text not null,
  channel text not null check (channel in ('Email', 'LinkedIn', 'Call', 'WhatsApp', 'Instagram', 'Facebook Messenger', 'Other')),
  date date not null default current_date,
  outcome text not null check (outcome in ('No reply', 'Replied', 'Meeting booked', 'Not a fit', 'Follow-up')),
  note text,
  created_at timestamptz not null default now()
);

table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time time,
  owner_id uuid references public.team_profiles(id),
  related_type text not null check (related_type in ('Lead', 'Client', 'Project')),
  related_id uuid not null,
  related_name text not null,
  done boolean not null default false,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

table if not exists public.research_items (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  subject_type text not null check (subject_type in ('Lead', 'Client', 'Project')),
  finding text not null,
  source text not null,
  status public.research_status not null default 'Unverified',
  confidence integer not null default 0 check (confidence between 0 and 100),
  reviewer_note text,
  updated_at date not null default current_date,
  created_at timestamptz not null default now()
);

table if not exists public.qa_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  section text not null,
  done boolean not null default false,
  issue text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute procedure public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
drop trigger if exists follow_ups_set_updated_at on public.follow_ups;
create trigger follow_ups_set_updated_at before update on public.follow_ups for each row execute procedure public.set_updated_at();
drop trigger if exists qa_items_set_updated_at on public.qa_items;
create trigger qa_items_set_updated_at before update on public.qa_items for each row execute procedure public.set_updated_at();

alter table public.team_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.projects enable row level security;
alter table public.outreach enable row level security;
alter table public.follow_ups enable row level security;
alter table public.research_items enable row level security;
alter table public.qa_items enable row level security;

-- Internal MVP policy: authenticated team members can read and write workspace records.
-- Narrow this to a team membership table before opening the project beyond the team.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['team_profiles','clients','leads','projects','outreach','follow_ups','research_items','qa_items'] loop
    execute format('drop policy if exists authenticated_workspace_access on public.%I', table_name);
    execute format('create policy authenticated_workspace_access on public.%I for all to authenticated using (true) with check (true)', table_name);
  end loop;
end $$;

-- Import guidance:
-- 1. Normalize the source repository export to the tables above.
-- 2. Load team_profiles first, then clients/leads, then projects and activity tables.
-- 3. Run counts and spot-check relationships after import.
-- 4. Do not run a destructive reset against a shared Supabase project.
