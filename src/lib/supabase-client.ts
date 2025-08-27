import { createClient } from '@supabase/supabase-js'

// 클라이언트사이드 전용 (anon key 사용, 하지만 API Routes를 통해 호출)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
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