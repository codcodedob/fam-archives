create extension if not exists pgcrypto;

create table if not exists archive_records (
  id uuid primary key default gen_random_uuid(),
  archive_id text unique not null,
  type text not null,
  title text not null,
  author_id uuid,
  originality text not null check (originality in ('native','deposited','digitized')),
  status text not null default 'draft' check (status in ('draft','sealed','archived')),
  current_version integer not null default 1,
  original_creation_at timestamptz,
  archived_at timestamptz,
  integrity_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists archive_versions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references archive_records(id) on delete cascade,
  version_number integer not null,
  title text not null,
  body text not null default '',
  author_id uuid,
  created_at timestamptz not null default now(),
  content_hash text,
  unique(record_id, version_number)
);

create table if not exists archive_sources (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references archive_records(id) on delete cascade,
  source_type text not null check (source_type in ('text','audio','video','image','document')),
  source_uri text,
  transcript text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists archive_events (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references archive_records(id) on delete cascade,
  event_type text not null,
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
