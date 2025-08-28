import { createClient } from '@supabase/supabase-js'

// 서버사이드 전용 (service role key 사용)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server environment variables')
}

export const supabaseServer = createClient(
  supabaseUrl,
  supabaseServiceKey,
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