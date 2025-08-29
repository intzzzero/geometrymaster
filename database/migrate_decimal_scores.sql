-- GeometryMaster 소수점 점수 지원을 위한 마이그레이션 쿼리
-- scores 테이블의 high_score 필드를 INTEGER에서 DECIMAL(5,3)로 변경

-- 1. 기존 제약조건 제거
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_high_score_check;

-- 2. 컬럼 타입 변경 (INTEGER → DECIMAL(5,3))
ALTER TABLE scores ALTER COLUMN high_score TYPE DECIMAL(5,3);

-- 3. 새로운 제약조건 추가 (0.000 ~ 100.000)
ALTER TABLE scores ADD CONSTRAINT scores_high_score_check 
  CHECK (high_score >= 0.000 AND high_score <= 100.000);

-- 4. 기존 인덱스 재생성 (성능 최적화)
DROP INDEX IF EXISTS idx_scores_high_score;
CREATE INDEX idx_scores_high_score ON scores(high_score DESC);

-- 5. 변경사항 확인 쿼리
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'scores' AND column_name = 'high_score';