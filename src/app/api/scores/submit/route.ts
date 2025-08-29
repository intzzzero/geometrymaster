import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { SHAPES, type ShapeType } from '@/lib/supabase-server'

// ISO 8601 주차 계산 함수
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

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

    if (score < 0 || score > 100 || !Number.isFinite(score)) {
      return NextResponse.json(
        { error: 'Score must be between 0.000 and 100.000' },
        { status: 400 }
      )
    }

    // 소수점 3자리로 제한
    const formattedScore = Number(score.toFixed(3))

    // 현재 주차 정보
    const currentWeekYear = new Date().getFullYear()
    const currentWeekNumber = getWeekNumber(new Date())

    // 현재 주간 기존 최고 점수 확인
    const { data: existingScore, error: fetchError } = await supabaseServer
      .from('scores')
      .select('high_score')
      .eq('user_id', userId)
      .eq('shape', shape)
      .eq('week_year', currentWeekYear)
      .eq('week_number', currentWeekNumber)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching existing score:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch existing score' },
        { status: 500 }
      )
    }

    const isNewRecord = !existingScore || formattedScore > existingScore.high_score

    if (isNewRecord) {
      // 신기록인 경우에만 업데이트
      const { data, error } = await supabaseServer
        .from('scores')
        .upsert({
          user_id: userId,
          shape,
          high_score: formattedScore,
          week_year: currentWeekYear,
          week_number: currentWeekNumber,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,shape,week_year,week_number'
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