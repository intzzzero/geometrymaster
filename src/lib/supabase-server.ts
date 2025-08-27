import { createClient } from '@supabase/supabase-js'

// 서버사이드 전용 (service role key 사용)
export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export const SHAPES = {
  CIRCLE: 'circle',
  STAR5: 'star5', 
  SQUARE: 'square',
  TRIANGLE: 'triangle'
} as const

export type ShapeType = typeof SHAPES[keyof typeof SHAPES]