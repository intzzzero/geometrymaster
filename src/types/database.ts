// 데이터베이스 타입 정의
export interface User {
  id: string
  google_uid: string
  nickname: string
  email: string | null
  created_at: string
}

export interface Score {
  id: string
  user_id: string
  shape: 'circle' | 'star5' | 'square' | 'triangle'
  high_score: number // DECIMAL(5,3) - 소수점 3자리 지원
  updated_at: string
}

// API 응답용 확장 타입
export interface ScoreWithUser extends Score {
  users?: {
    nickname: string
  } | null
}

// 랭킹용 인터페이스
export interface RankingEntry {
  rank: number
  userId: string
  nickname: string
  score: number
  updatedAt: string
}

export interface RankingResponse {
  ranking: RankingEntry[]
  userRank: number | null
  userInfo: RankingEntry | null
}