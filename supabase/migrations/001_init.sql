-- BehaviorCI Supabase schema
-- Run this in your Supabase SQL editor or via the Supabase CLI

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── features: aggregate health per AI feature ─────────────────────────────
create table if not exists features (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,
  repo         text,
  latest_score decimal(5, 2),
  run_count    integer not null default 0,
  last_run_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── runs: each CI/CLI evaluation run ──────────────────────────────────────
create table if not exists runs (
  id            uuid primary key default gen_random_uuid(),
  feature_name  text not null references features(name) on delete cascade,
  commit_sha    text,
  branch        text,
  pr_number     integer,
  repo          text,
  overall_score decimal(5, 2) not null,
  passed        boolean not null,
  total_tests   integer not null,
  passed_tests  integer not null,
  threshold     decimal(5, 2) not null default 85,
  duration_ms   integer,
  created_at    timestamptz not null default now()
);

-- ─── test_results: individual test case results within a run ────────────────
create table if not exists test_results (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references runs(id) on delete cascade,
  behavior_name    text not null,
  test_input       text,
  actual_output    text,
  passed           boolean not null,
  score            decimal(5, 2),
  check_type       text,         -- 'rule' | 'semantic'
  failure_reason   text,
  judge_reasoning  text,
  duration_ms      integer,
  created_at       timestamptz not null default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists runs_feature_name_idx on runs(feature_name);
create index if not exists runs_created_at_idx on runs(created_at desc);
create index if not exists test_results_run_id_idx on test_results(run_id);
create index if not exists test_results_passed_idx on test_results(passed);

-- ─── Row Level Security (enable for production) ─────────────────────────────
alter table features enable row level security;
alter table runs enable row level security;
alter table test_results enable row level security;

-- Allow public read for dashboard (anon key)
create policy "Allow public read on features"
  on features for select using (true);

create policy "Allow public read on runs"
  on runs for select using (true);

create policy "Allow public read on test_results"
  on test_results for select using (true);

-- Allow insert from service role (GitHub Action uses service key)
create policy "Allow service insert on features"
  on features for insert with check (true);

create policy "Allow service upsert on features"
  on features for update using (true);

create policy "Allow service insert on runs"
  on runs for insert with check (true);

create policy "Allow service insert on test_results"
  on test_results for insert with check (true);
