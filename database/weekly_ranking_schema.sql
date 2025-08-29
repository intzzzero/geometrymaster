-- GeometryMaster 주간 랭킹 시스템 및 명예의 전당
-- 기존 scores 테이블을 주간 랭킹으로 활용하고, 명예의 전당 테이블 추가

-- 1. 주간 랭킹을 위한 기존 scores 테이블 수정
ALTER TABLE scores ADD COLUMN week_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());
ALTER TABLE scores ADD COLUMN week_number INTEGER DEFAULT EXTRACT(WEEK FROM NOW());
ALTER TABLE scores ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 기존 UNIQUE 제약조건 삭제 후 주간 단위로 재생성
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_user_id_shape_key;
ALTER TABLE scores ADD CONSTRAINT scores_user_shape_week_unique 
  UNIQUE(user_id, shape, week_year, week_number);

-- 주간 랭킹용 인덱스 추가
CREATE INDEX idx_scores_week_year ON scores(week_year);
CREATE INDEX idx_scores_week_number ON scores(week_number);
CREATE INDEX idx_scores_week_year_number ON scores(week_year, week_number);
CREATE INDEX idx_scores_week_shape_score ON scores(week_year, week_number, shape, high_score DESC);

-- 2. 명예의 전당 테이블 생성
CREATE TABLE hall_of_fame (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shape VARCHAR(20) NOT NULL CHECK (shape IN ('circle', 'star5', 'square', 'triangle')),
  champion_score DECIMAL(5,3) NOT NULL CHECK (champion_score >= 0.000 AND champion_score <= 100.000),
  week_year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shape, week_year, week_number)
);

-- 명예의 전당 인덱스
CREATE INDEX idx_hall_of_fame_shape ON hall_of_fame(shape);
CREATE INDEX idx_hall_of_fame_week_year ON hall_of_fame(week_year DESC);
CREATE INDEX idx_hall_of_fame_week_number ON hall_of_fame(week_number DESC);
CREATE INDEX idx_hall_of_fame_shape_week ON hall_of_fame(shape, week_year DESC, week_number DESC);

-- 3. 명예의 전당 RLS 정책
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 명예의 전당을 볼 수 있음
CREATE POLICY "Anyone can view hall of fame" ON hall_of_fame
  FOR SELECT USING (true);

-- 시스템만 명예의 전당에 데이터 추가/수정 (일반적으로 관리자나 시스템 프로세스에서만)
CREATE POLICY "System can manage hall of fame" ON hall_of_fame
  FOR ALL USING (false); -- 일반 사용자는 직접 조작 불가

-- 4. 주간 랭킹 초기화를 위한 저장 프로시저
CREATE OR REPLACE FUNCTION initialize_weekly_ranking()
RETURNS void AS $$
DECLARE
  current_week_year INTEGER := EXTRACT(YEAR FROM NOW());
  current_week_number INTEGER := EXTRACT(WEEK FROM NOW());
  prev_week_year INTEGER;
  prev_week_number INTEGER;
  champion_record RECORD;
BEGIN
  -- 이전 주차 계산
  IF current_week_number = 1 THEN
    prev_week_year := current_week_year - 1;
    prev_week_number := 52; -- 또는 53 (연도에 따라)
  ELSE
    prev_week_year := current_week_year;
    prev_week_number := current_week_number - 1;
  END IF;

  -- 각 도형별로 이전 주차 1위를 명예의 전당에 추가
  FOR champion_record IN 
    SELECT DISTINCT ON (s.shape) 
      s.user_id, 
      s.shape, 
      s.high_score,
      s.week_year,
      s.week_number
    FROM scores s
    WHERE s.week_year = prev_week_year 
      AND s.week_number = prev_week_number
    ORDER BY s.shape, s.high_score DESC
  LOOP
    -- 명예의 전당에 추가 (중복 방지)
    INSERT INTO hall_of_fame (user_id, shape, champion_score, week_year, week_number)
    VALUES (
      champion_record.user_id, 
      champion_record.shape, 
      champion_record.high_score,
      champion_record.week_year,
      champion_record.week_number
    )
    ON CONFLICT (shape, week_year, week_number) DO NOTHING;
  END LOOP;

  -- 이전 주차 scores 데이터는 보관 (삭제하지 않음, 명예의 전당에서 참조)
  -- 현재 주차에 대한 새로운 랭킹 시작은 자연스럽게 진행
  
  RAISE NOTICE 'Weekly ranking initialized for week % of year %', current_week_number, current_week_year;
END;
$$ LANGUAGE plpgsql;

-- 5. 주간 초기화 작업을 위한 스케줄러 설정 가이드 (주석)
-- PostgreSQL에서 cron job을 설정하거나, 
-- 애플리케이션 레벨에서 매주 월요일마다 initialize_weekly_ranking() 호출

-- 6. 유틸리티 뷰 - 현재 주간 랭킹
CREATE OR REPLACE VIEW current_week_ranking AS
SELECT 
  s.shape,
  s.high_score,
  s.updated_at,
  s.user_id,
  u.nickname,
  RANK() OVER (PARTITION BY s.shape ORDER BY s.high_score DESC) as rank
FROM scores s
JOIN users u ON s.user_id = u.id
WHERE s.week_year = EXTRACT(YEAR FROM NOW())
  AND s.week_number = EXTRACT(WEEK FROM NOW());

-- 7. 유틸리티 뷰 - 명예의 전당 요약 (도형별 최신 순)
CREATE OR REPLACE VIEW hall_of_fame_summary AS
SELECT 
  h.shape,
  h.champion_score,
  h.week_year,
  h.week_number,
  h.achieved_at,
  u.nickname as champion_nickname,
  CONCAT(h.week_year, '-', LPAD(h.week_number::text, 2, '0')) as week_display
FROM hall_of_fame h
JOIN users u ON h.user_id = u.id
ORDER BY h.shape, h.week_year DESC, h.week_number DESC;

-- 8. 기존 scores 데이터에 주간 정보 업데이트 (마이그레이션)
UPDATE scores 
SET week_year = EXTRACT(YEAR FROM updated_at),
    week_number = EXTRACT(WEEK FROM updated_at),
    created_at = updated_at
WHERE week_year IS NULL OR week_number IS NULL;