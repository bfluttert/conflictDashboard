-- Enable extension for UUID generation (Supabase usually has this)
create extension if not exists pgcrypto;

-- Dashboards table stores per-user layout per conflict
create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conflict_id integer not null,
  layout jsonb not null,
  updated_at timestamptz not null default now(),
  unique(user_id, conflict_id)
);

alter table public.dashboards enable row level security;

-- Policies: user can see and modify only their own rows
drop policy if exists "dashboards_select_own" on public.dashboards;
create policy "dashboards_select_own"
  on public.dashboards for select
  using (auth.uid() = user_id);

drop policy if exists "dashboards_insert_own" on public.dashboards;
create policy "dashboards_insert_own"
  on public.dashboards for insert
  with check (auth.uid() = user_id);

drop policy if exists "dashboards_update_own" on public.dashboards;
create policy "dashboards_update_own"
  on public.dashboards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cached AI-generated conflict summaries (publicly readable)
create table if not exists public.conflict_summaries (
  conflict_id       integer primary key,
  country_id        integer,
  summary_text      text not null,
  model             text not null,
  last_generated_at timestamptz not null default now()
);

alter table public.conflict_summaries enable row level security;

-- Anyone (including anon) can read summaries
drop policy if exists "conflict_summaries_select_all" on public.conflict_summaries;
create policy "conflict_summaries_select_all"
  on public.conflict_summaries for select
  using (true);

-- Only service role (Edge Functions) can insert/update
drop policy if exists "conflict_summaries_write_service" on public.conflict_summaries;
create policy "conflict_summaries_write_service"
  on public.conflict_summaries for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
