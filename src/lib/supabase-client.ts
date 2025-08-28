import { createClient } from '@supabase/supabase-js'

// 클라이언트사이드 전용 (anon key 사용, 하지만 API Routes를 통해 호출)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
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