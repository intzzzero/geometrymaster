import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { SHAPES, type ShapeType } from '@/lib/supabase-server'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shape = searchParams.get('shape') as ShapeType
    const userId = searchParams.get('userId')

    if (!shape || !Object.values(SHAPES).includes(shape)) {
      return NextResponse.json(
        { error: 'Invalid or missing shape parameter' },
        { status: 400 }
      )
    }

    // 현재 월 정보
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    // 현재 월간 상위 10위 가져오기
    const { data: topData, error: topError } = await supabaseServer
      .from('scores')
      .select(`
        user_id,
        high_score,
        updated_at,
        ranking_year,
        ranking_month,
        users (
          nickname
        )
      `)
      .eq('shape', shape)
      .eq('ranking_year', currentYear)
      .eq('ranking_month', currentMonth)
      .order('high_score', { ascending: false })
      .limit(10)

    if (topError) {
      return NextResponse.json(
        { error: 'Failed to fetch top rankings' },
        { status: 500 }
      )
    }

    // 현재 월간 전체 순위에서 사용자 위치 찾기 (userId가 있는 경우)
    let userRank = null
    let userScore = null
    if (userId) {
      // 현재 월간 사용자 점수 조회
      const { data: userScoreData } = await supabaseServer
        .from('scores')
        .select('high_score')
        .eq('shape', shape)
        .eq('user_id', userId)
        .eq('ranking_year', currentYear)
        .eq('ranking_month', currentMonth)
        .single()

      if (userScoreData) {
        userScore = userScoreData.high_score
        
        // 현재 월간에서 사용자보다 높은 점수의 개수를 세어 순위 계산
        const { count } = await supabaseServer
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('shape', shape)
          .eq('ranking_year', currentYear)
          .eq('ranking_month', currentMonth)
          .gt('high_score', userScoreData.high_score)
        
        userRank = (count || 0) + 1
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topRanking = topData.map((item: any, index: number) => ({
      rank: index + 1,
      userId: item.user_id,
      nickname: item.users?.nickname || 'Anonymous',
      score: item.high_score,
      updatedAt: item.updated_at
    }))

    // 사용자가 상위 10위에 없는 경우, 사용자 정보 추가
    let userInfo = null
    if (userId && userRank && userRank > 10 && userScore) {
      const { data: userData } = await supabaseServer
        .from('users')
        .select('nickname')
        .eq('id', userId)
        .single()
      
      const { data: userScoreInfo } = await supabaseServer
        .from('scores')
        .select('updated_at')
        .eq('shape', shape)
        .eq('user_id', userId)
        .eq('ranking_year', currentYear)
        .eq('ranking_month', currentMonth)
        .single()

      userInfo = {
        rank: userRank,
        userId: userId,
        nickname: userData?.nickname || 'Anonymous',
        score: userScore,
        updatedAt: userScoreInfo?.updated_at || new Date().toISOString()
      }
    }

    return NextResponse.json({ 
      ranking: topRanking,
      userRank: userRank,
      userInfo: userInfo
    })
  } catch (error) {
    console.error('Ranking fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}