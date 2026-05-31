-- Repair mock_test_attempts when the table exists but columns are missing or wrong.
-- Run in Supabase SQL Editor, then: Settings → API → Reload schema (required).

-- 1) See what you actually have (copy result before changing anything):
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mock_test_attempts'
ORDER BY ordinal_position;

-- 2) Add every column the app expects (safe to re-run):
ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE mock_test_attempts
  ADD COLUMN IF NOT EXISTS mock_test_id uuid REFERENCES mock_tests (id) ON DELETE CASCADE;

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

-- Backfill status for rows that predate the column
UPDATE mock_test_attempts
SET status = 'submitted'
WHERE status IS NULL AND submitted_at IS NOT NULL;

UPDATE mock_test_attempts
SET status = 'in_progress'
WHERE status IS NULL;

ALTER TABLE mock_test_attempts
  DROP CONSTRAINT IF EXISTS mock_test_attempts_status_check;

ALTER TABLE mock_test_attempts
  ADD CONSTRAINT mock_test_attempts_status_check
  CHECK (status IN ('in_progress', 'submitted'));

CREATE INDEX IF NOT EXISTS mock_test_attempts_user_mock_idx
  ON mock_test_attempts (user_id, mock_test_id);

-- 3) Force PostgREST to reload (also click Reload schema in Dashboard → Settings → API)
NOTIFY pgrst, 'reload schema';

-- 4) Verify again — you should see status, completed_orders, task_results, current_order:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mock_test_attempts'
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- OPTIONAL: only if the table is empty or you do not need old attempt data.
-- Uncomment to drop and recreate with the correct shape in one step.
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS mock_test_attempts CASCADE;
--
-- CREATE TABLE mock_test_attempts (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
--   mock_test_id uuid NOT NULL REFERENCES mock_tests (id) ON DELETE CASCADE,
--   status text NOT NULL DEFAULT 'in_progress'
--     CHECK (status IN ('in_progress', 'submitted')),
--   completed_orders integer[] NOT NULL DEFAULT '{}',
--   task_results jsonb NOT NULL DEFAULT '{}'::jsonb,
--   current_order integer NOT NULL DEFAULT 1,
--   submitted_at timestamptz,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   updated_at timestamptz NOT NULL DEFAULT now()
-- );
--
-- CREATE INDEX mock_test_attempts_user_mock_idx
--   ON mock_test_attempts (user_id, mock_test_id);
--
-- NOTIFY pgrst, 'reload schema';
