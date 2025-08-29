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
  ranking_year: number
  ranking_month: number
  updated_at: string
  created_at: string
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

// 명예의 전당 관련 인터페이스
export interface HallOfFame {
  id: string
  user_id: string
  shape: 'circle' | 'star5' | 'square' | 'triangle'
  champion_score: number
  ranking_year: number
  ranking_month: number
  achieved_at: string
}

export interface HallOfFameEntry {
  id: string
  shape: 'circle' | 'star5' | 'square' | 'triangle'
  championScore: number
  rankingYear: number
  rankingMonth: number
  monthDisplay: string // "2024-01" 형태
  championNickname: string
  achievedAt: string
}

export interface YearStats {
  year: number
  totalMonths: number
  uniqueShapes: number
  highestScore: number
  averageScore: number
}

export interface HallOfFameResponse {
  hallOfFame: HallOfFameEntry[]
  yearStats: YearStats[]
  totalRecords: number
  currentMonth: {
    year: number
    month: number
  }
}