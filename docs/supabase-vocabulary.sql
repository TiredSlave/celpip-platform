-- Run in Supabase SQL Editor when you want DB-backed vocabulary (optional).
-- Until then, the app uses localStorage for reading/listening saves and a built-in seed for speaking patterns.

-- ---------------------------------------------------------------------------
-- Data API + explicit GRANTs (Supabase email / dashboard notice, 2026)
-- New projects (~May 30, 2026): tables in `public` are not exposed to
-- PostgREST / supabase-js until you GRANT to `anon`, `authenticated`, and/or
-- `service_role` as needed. Existing projects: same enforcement ~Oct 30, 2026.
-- RLS still controls which *rows* each role sees; GRANT controls whether the
-- role may use the table at all via the Data API.
-- If a grant is missing, PostgREST often returns 42501 with a suggested GRANT.
-- Review: Dashboard → Security Advisor.
-- ---------------------------------------------------------------------------

-- Speaking / fixed expressions (Source 3) — Admin CRUD target
create table if not exists public.speaking_vocabulary (
  id uuid primary key default gen_random_uuid(),
  task_number int not null check (task_number between 1 and 8),
  phrase text not null,
  category text,
  example_sentence text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users (id)
);

create index if not exists speaking_vocabulary_task_idx on public.speaking_vocabulary (task_number, sort_order);

-- User-saved words from reading/listening (Source 1 & 2) — optional sync from localStorage later
create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  source text not null check (source in ('reading', 'listening')),
  task_id text,
  context_snippet text,
  sample_sentence text,
  phonetic text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  unique (user_id, term, source, task_id, context_snippet)
);

create index if not exists user_vocabulary_user_fav_idx on public.user_vocabulary (user_id, is_favorite desc, created_at desc);

-- Expose tables to the Data API (supabase-js / PostgREST). Adjust if you use GraphQL.
-- speaking_vocabulary: app reads with anon or authenticated client; writes are via Dashboard / service_role or future admin API.
grant select on public.speaking_vocabulary to anon;
grant select on public.speaking_vocabulary to authenticated;
grant select, insert, update, delete on public.speaking_vocabulary to service_role;

-- user_vocabulary: only signed-in users (RLS restricts to own rows). No anon.
grant select, insert, update, delete on public.user_vocabulary to authenticated;
grant select, insert, update, delete on public.user_vocabulary to service_role;

alter table public.speaking_vocabulary enable row level security;
alter table public.user_vocabulary enable row level security;

-- Speaking patterns: readable reference data (authenticated + anon). Writes: Dashboard / service_role.
create policy "speaking_vocabulary_select_authenticated"
  on public.speaking_vocabulary for select
  to authenticated
  using (true);

create policy "speaking_vocabulary_select_anon"
  on public.speaking_vocabulary for select
  to anon
  using (true);

create policy "user_vocabulary_own"
  on public.user_vocabulary for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- If you already applied an older script (tables exist but no GRANTs), run in SQL Editor:
--   grant select on public.speaking_vocabulary to anon, authenticated;
--   grant select, insert, update, delete on public.speaking_vocabulary to service_role;
--   grant select, insert, update, delete on public.user_vocabulary to authenticated, service_role;
--   create policy "speaking_vocabulary_select_anon" on public.speaking_vocabulary for select to anon using (true);
