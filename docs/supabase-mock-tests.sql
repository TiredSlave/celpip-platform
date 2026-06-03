-- Mock test module: run in Supabase SQL editor
-- Enforces single skill per mock, unique task assignment, and attempt tracking.
-- If admin create fails with RLS errors, also run docs/supabase-mock-tests-rls.sql.

-- 1) One skill per mock test
ALTER TABLE mock_tests
  ADD COLUMN IF NOT EXISTS test_type text;

ALTER TABLE mock_tests
  DROP CONSTRAINT IF EXISTS mock_tests_test_type_check;

ALTER TABLE mock_tests
  ADD CONSTRAINT mock_tests_test_type_check
  CHECK (test_type IS NULL OR test_type IN ('Listening', 'Reading', 'Writing', 'Speaking'));

-- 2) Each library task may belong to at most one mock test
CREATE UNIQUE INDEX IF NOT EXISTS mock_test_tasks_task_id_unique
  ON mock_test_tasks (task_id);

-- 3) User attempts (final submit only when all parts are done)
CREATE TABLE IF NOT EXISTS mock_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  mock_test_id uuid NOT NULL REFERENCES mock_tests (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted')),
  completed_orders integer[] NOT NULL DEFAULT '{}',
  task_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_order integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mock_test_attempts_user_mock_idx
  ON mock_test_attempts (user_id, mock_test_id);

-- If table already exists from an earlier migration, add missing columns:
ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress';

ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS completed_orders integer[] NOT NULL DEFAULT '{}';

ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS task_results jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS current_order integer NOT NULL DEFAULT 1;

ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE mock_test_attempts SET status = 'in_progress' WHERE status IS NULL;

ALTER TABLE mock_test_attempts
  DROP CONSTRAINT IF EXISTS mock_test_attempts_status_check;

ALTER TABLE mock_test_attempts
  ADD CONSTRAINT mock_test_attempts_status_check
  CHECK (status IN ('in_progress', 'submitted'));

-- Reload PostgREST schema cache (Dashboard → Settings → API → Reload schema, or run NOTIFY):
NOTIFY pgrst, 'reload schema';
