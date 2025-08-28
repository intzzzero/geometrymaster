import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { SHAPES, type ShapeType } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, shape, score } = await request.json()

    if (!userId || !shape || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!Object.values(SHAPES).includes(shape as ShapeType)) {
      return NextResponse.json(
        { error: 'Invalid shape' },
        { status: 400 }
      )
    }

    if (score < 0 || score > 100) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 100' },
        { status: 400 }
      )
    }

    // 기존 최고 점수 확인
    const { data: existingScore, error: fetchError } = await supabaseServer
      .from('scores')
      .select('high_score')
      .eq('user_id', userId)
      .eq('shape', shape)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching existing score:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch existing score' },
        { status: 500 }
      )
    }

    const isNewRecord = !existingScore || score > existingScore.high_score

    if (isNewRecord) {
      // 신기록인 경우에만 업데이트
      const { data, error } = await supabaseServer
        .from('scores')
        .upsert({
          user_id: userId,
          shape,
          high_score: score,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,shape'
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving score:', error)
        return NextResponse.json(
          { error: 'Failed to save score' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        score: data,
        isNewRecord: true,
        previousBest: existingScore?.high_score || 0
      })
    }

    return NextResponse.json({
      score: { high_score: existingScore.high_score },
      isNewRecord: false,
      previousBest: existingScore.high_score
    })
  } catch (error) {
    console.error('Score submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}