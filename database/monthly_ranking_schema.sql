-- GeometryMaster 월간 랭킹 시스템 및 명예의 전당
-- 기존 주간 시스템을 월간 시스템으로 변경

-- 1. 기존 주간 관련 컬럼 제거 및 월간 컬럼 추가
ALTER TABLE scores DROP COLUMN IF EXISTS week_year;
ALTER TABLE scores DROP COLUMN IF EXISTS week_number;

ALTER TABLE scores ADD COLUMN ranking_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());
ALTER TABLE scores ADD COLUMN ranking_month INTEGER DEFAULT EXTRACT(MONTH FROM NOW());
ALTER TABLE scores ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 기존 UNIQUE 제약조건 삭제 후 월간 단위로 재생성
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_user_shape_week_unique;
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_user_id_shape_key;
ALTER TABLE scores ADD CONSTRAINT scores_user_shape_month_unique 
  UNIQUE(user_id, shape, ranking_year, ranking_month);

-- 월간 랭킹용 인덱스 추가
DROP INDEX IF EXISTS idx_scores_week_year;
DROP INDEX IF EXISTS idx_scores_week_number;
DROP INDEX IF EXISTS idx_scores_week_year_number;
DROP INDEX IF EXISTS idx_scores_week_shape_score;

CREATE INDEX idx_scores_ranking_year ON scores(ranking_year);
CREATE INDEX idx_scores_ranking_month ON scores(ranking_month);
CREATE INDEX idx_scores_ranking_year_month ON scores(ranking_year, ranking_month);
CREATE INDEX idx_scores_month_shape_score ON scores(ranking_year, ranking_month, shape, high_score DESC);

-- 2. 명예의 전당 테이블을 월간 기준으로 수정
DROP TABLE IF EXISTS hall_of_fame;

CREATE TABLE hall_of_fame (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shape VARCHAR(20) NOT NULL CHECK (shape IN ('circle', 'star5', 'square', 'triangle')),
  champion_score DECIMAL(5,3) NOT NULL CHECK (champion_score >= 0.000 AND champion_score <= 100.000),
  ranking_year INTEGER NOT NULL,
  ranking_month INTEGER NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shape, ranking_year, ranking_month)
);

-- 명예의 전당 인덱스
CREATE INDEX idx_hall_of_fame_shape ON hall_of_fame(shape);
CREATE INDEX idx_hall_of_fame_ranking_year ON hall_of_fame(ranking_year DESC);
CREATE INDEX idx_hall_of_fame_ranking_month ON hall_of_fame(ranking_month DESC);
CREATE INDEX idx_hall_of_fame_shape_month ON hall_of_fame(shape, ranking_year DESC, ranking_month DESC);

-- 3. 명예의 전당 RLS 정책
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 명예의 전당을 볼 수 있음
CREATE POLICY "Anyone can view hall of fame" ON hall_of_fame
  FOR SELECT USING (true);

-- 시스템만 명예의 전당에 데이터 추가/수정
CREATE POLICY "System can manage hall of fame" ON hall_of_fame
  FOR ALL USING (false);

-- 4. 월간 랭킹 초기화를 위한 저장 프로시저
CREATE OR REPLACE FUNCTION initialize_monthly_ranking()
RETURNS void AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
  current_month INTEGER := EXTRACT(MONTH FROM NOW());
  prev_year INTEGER;
  prev_month INTEGER;
  champion_record RECORD;
BEGIN
  -- 이전 월 계산
  IF current_month = 1 THEN
    prev_year := current_year - 1;
    prev_month := 12;
  ELSE
    prev_year := current_year;
    prev_month := current_month - 1;
  END IF;

  -- 각 도형별로 이전 월 1위를 명예의 전당에 추가
  FOR champion_record IN 
    SELECT DISTINCT ON (s.shape) 
      s.user_id, 
      s.shape, 
      s.high_score,
      s.ranking_year,
      s.ranking_month
    FROM scores s
    WHERE s.ranking_year = prev_year 
      AND s.ranking_month = prev_month
    ORDER BY s.shape, s.high_score DESC
  LOOP
    -- 명예의 전당에 추가 (중복 방지)
    INSERT INTO hall_of_fame (user_id, shape, champion_score, ranking_year, ranking_month)
    VALUES (
      champion_record.user_id, 
      champion_record.shape, 
      champion_record.high_score,
      champion_record.ranking_year,
      champion_record.ranking_month
    )
    ON CONFLICT (shape, ranking_year, ranking_month) DO NOTHING;
  END LOOP;

  -- 이전 월 scores 데이터는 보관 (삭제하지 않음, 명예의 전당에서 참조)
  -- 현재 월에 대한 새로운 랭킹 시작은 자연스럽게 진행
  
  RAISE NOTICE 'Monthly ranking initialized for % / %', current_month, current_year;
END;
$$ LANGUAGE plpgsql;

-- 5. 유틸리티 뷰 - 현재 월간 랭킹
CREATE OR REPLACE VIEW current_month_ranking AS
SELECT 
  s.shape,
  s.high_score,
  s.updated_at,
  s.user_id,
  u.nickname,
  RANK() OVER (PARTITION BY s.shape ORDER BY s.high_score DESC) as rank
FROM scores s
JOIN users u ON s.user_id = u.id
WHERE s.ranking_year = EXTRACT(YEAR FROM NOW())
  AND s.ranking_month = EXTRACT(MONTH FROM NOW());

-- 6. 유틸리티 뷰 - 명예의 전당 요약 (도형별 최신 순)
CREATE OR REPLACE VIEW hall_of_fame_summary AS
SELECT 
  h.shape,
  h.champion_score,
  h.ranking_year,
  h.ranking_month,
  h.achieved_at,
  u.nickname as champion_nickname,
  CONCAT(h.ranking_year, '-', LPAD(h.ranking_month::text, 2, '0')) as month_display
FROM hall_of_fame h
JOIN users u ON h.user_id = u.id
ORDER BY h.shape, h.ranking_year DESC, h.ranking_month DESC;

-- 7. 기존 scores 데이터에 월간 정보 업데이트 (마이그레이션)
UPDATE scores 
SET ranking_year = EXTRACT(YEAR FROM updated_at),
    ranking_month = EXTRACT(MONTH FROM updated_at),
    created_at = updated_at
WHERE ranking_year IS NULL OR ranking_month IS NULL;