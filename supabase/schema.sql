-- RouteRun database schema.
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent).

-- Per-driver settings (one row per user).
create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  start_hour int not null default 9,
  avg_speed_mph int not null default 20,
  service_min_per_stop int not null default 3,
  round_trip boolean not null default false,
  depot_lat double precision not null,
  depot_lng double precision not null,
  updated_at timestamptz not null default now()
);

-- Per-driver current route (single active route per user).
create table if not exists public.routes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stops jsonb not null default '[]'::jsonb,
  route_result jsonb,
  updated_at timestamptz not null default now()
);

-- Row-Level Security: each driver can only read/write their own rows.
alter table public.settings enable row level security;
alter table public.routes enable row level security;

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own routes" on public.routes;
create policy "own routes" on public.routes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
