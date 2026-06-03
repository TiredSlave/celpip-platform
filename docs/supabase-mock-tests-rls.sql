-- Mock tests RLS: run in Supabase SQL Editor (safe to re-run).
-- Fixes: "new row violates row-level security policy for table mock_tests"
--
-- Prerequisite: your user has profiles.is_admin = true (Table Editor → profiles).

-- ---------------------------------------------------------------------------
-- 1) Remove every existing policy on these tables (avoids conflicts with old rules)
-- ---------------------------------------------------------------------------
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'mock_tests'
  loop
    execute format('drop policy if exists %I on public.mock_tests', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'mock_test_tasks'
  loop
    execute format('drop policy if exists %I on public.mock_test_tasks', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'mock_test_attempts'
  loop
    execute format('drop policy if exists %I on public.mock_test_attempts', pol.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Helper (security definer — reads profiles even if profiles has RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  admin_flag boolean;
begin
  select coalesce(p.is_admin, false)
    into admin_flag
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  return coalesce(admin_flag, false);
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Table grants (Data API)
-- ---------------------------------------------------------------------------
grant select on public.mock_tests to anon, authenticated;
grant select, insert, update, delete on public.mock_tests to authenticated;
grant select, insert, update, delete on public.mock_tests to service_role;

grant select on public.mock_test_tasks to anon, authenticated;
grant select, insert, update, delete on public.mock_test_tasks to authenticated;
grant select, insert, update, delete on public.mock_test_tasks to service_role;

grant select, insert, update, delete on public.mock_test_attempts to authenticated;
grant select, insert, update, delete on public.mock_test_attempts to service_role;

alter table public.mock_tests enable row level security;
alter table public.mock_test_tasks enable row level security;
alter table public.mock_test_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- 4) mock_tests policies
-- ---------------------------------------------------------------------------
create policy "mock_tests_select_published"
  on public.mock_tests for select
  to anon, authenticated
  using (coalesce(is_published, false) = true);

create policy "mock_tests_admin_select"
  on public.mock_tests for select
  to authenticated
  using (public.is_admin());

create policy "mock_tests_admin_insert"
  on public.mock_tests for insert
  to authenticated
  with check (public.is_admin());

create policy "mock_tests_admin_update"
  on public.mock_tests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "mock_tests_admin_delete"
  on public.mock_tests for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5) mock_test_tasks policies
-- ---------------------------------------------------------------------------
create policy "mock_test_tasks_select_published"
  on public.mock_test_tasks for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.mock_tests mt
      where mt.id = mock_test_id
        and coalesce(mt.is_published, false) = true
    )
  );

create policy "mock_test_tasks_admin_select"
  on public.mock_test_tasks for select
  to authenticated
  using (public.is_admin());

create policy "mock_test_tasks_admin_insert"
  on public.mock_test_tasks for insert
  to authenticated
  with check (public.is_admin());

create policy "mock_test_tasks_admin_update"
  on public.mock_test_tasks for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "mock_test_tasks_admin_delete"
  on public.mock_test_tasks for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6) mock_test_attempts policies
-- ---------------------------------------------------------------------------
create policy "mock_test_attempts_own"
  on public.mock_test_attempts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mock_test_attempts_admin_select"
  on public.mock_test_attempts for select
  to authenticated
  using (public.is_admin());

notify pgrst, 'reload schema';

-- Verify (optional): while signed in as admin in SQL editor you cannot easily test auth.uid().
-- In the app: create a mock test again after re-running this script.
