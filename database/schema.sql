-- GeometryMaster Database Schema
-- Users table: stores user information from Google OAuth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_uid VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scores table: stores high scores for each user and shape
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shape VARCHAR(20) NOT NULL CHECK (shape IN ('circle', 'star5', 'square', 'triangle')),
  high_score INTEGER NOT NULL CHECK (high_score >= 0 AND high_score <= 100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shape)
);

-- Create indexes for better performance
CREATE INDEX idx_scores_shape ON scores(shape);
CREATE INDEX idx_scores_high_score ON scores(high_score DESC);
CREATE INDEX idx_scores_user_shape ON scores(user_id, shape);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (google_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (google_uid = auth.jwt() ->> 'sub');

-- Scores can be read by everyone (for rankings), but only updated by owner
CREATE POLICY "Anyone can view scores" ON scores
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own scores" ON scores
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE google_uid = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can update own scores" ON scores
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE google_uid = auth.jwt() ->> 'sub'
  ));