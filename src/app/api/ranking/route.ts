import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { SHAPES, type ShapeType } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shape = searchParams.get('shape') as ShapeType

    if (!shape || !Object.values(SHAPES).includes(shape)) {
      return NextResponse.json(
        { error: 'Invalid or missing shape parameter' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('scores')
      .select(`
        high_score,
        updated_at,
        users (
          nickname
        )
      `)
      .eq('shape', shape)
      .order('high_score', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch ranking' },
        { status: 500 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ranking = data.map((item: any, index: number) => ({
      rank: index + 1,
      nickname: item.users?.nickname || 'Anonymous',
      score: item.high_score,
      updatedAt: item.updated_at
    }))

    return NextResponse.json({ ranking })
  } catch (error) {
    console.error('Ranking fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}