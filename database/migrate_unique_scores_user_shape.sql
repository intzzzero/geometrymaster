-- Ensure unique (user_id, shape) for scores upsert and remove duplicates
-- This migration will:
-- 1) Remove duplicate rows keeping the highest high_score (then latest updated_at)
-- 2) Add a UNIQUE index on (user_id, shape) to support ON CONFLICT

BEGIN;

-- 1) Deduplicate existing rows by (user_id, shape)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, shape
      ORDER BY high_score DESC, updated_at DESC, id
    ) AS rn
  FROM scores
)
DELETE FROM scores s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- 2) Replace non-unique index with a UNIQUE index on (user_id, shape)
DROP INDEX IF EXISTS idx_scores_user_shape;
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_user_id_shape_unique ON scores(user_id, shape);

COMMIT;

-- Verification (optional)
-- SELECT user_id, shape, COUNT(*)
-- FROM scores
-- GROUP BY 1,2
-- HAVING COUNT(*) > 1;

