import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { SHAPES, type ShapeType } from '@/lib/supabase-server'

// 현재 연/월 반환 유틸리티
function getCurrentYearMonth(date: Date): { year: number; month: number } {
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
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

    // 현재 월 정보
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth(new Date())

    // 현재 월간 기존 최고 점수 확인
    const { data: existingScore, error: fetchError } = await supabaseServer
      .from('scores')
      .select('high_score')
      .eq('user_id', userId)
      .eq('shape', shape)
      .eq('ranking_year', currentYear)
      .eq('ranking_month', currentMonth)
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
      // 신기록인 경우에만 업데이트 (월간 기준)
      const { data, error } = await supabaseServer
        .from('scores')
        .upsert({
          user_id: userId,
          shape,
          high_score: formattedScore,
          ranking_year: currentYear,
          ranking_month: currentMonth,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,shape,ranking_year,ranking_month'
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