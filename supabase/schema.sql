-- Supabase SQL 편집기에 그대로 붙여 넣으세요. (무료 플랜으로 충분합니다)
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default '',
  pw_salt text not null,
  pw_hash text not null,
  role text not null default 'user' check (role in ('user','owner')),
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  slug text unique not null,
  template text not null default 'dense',
  published boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists resumes_user_idx on public.resumes(user_id);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default '',
  type text not null default '',
  size bigint not null default 0,
  kind text not null default 'attachment',
  path text not null,
  url text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists files_user_idx on public.files(user_id);

-- 브라우저에서 직접 읽지 못하게 막는다. 서버(서비스 키)만 접근한다.
alter table public.users enable row level security;
alter table public.resumes enable row level security;
alter table public.files enable row level security;

-- 파일 보관함: Storage > New bucket 에서 이름 uploads, Public 체크로 만들어 주세요.
