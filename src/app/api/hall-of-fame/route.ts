import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { SHAPES, type ShapeType } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shape = searchParams.get('shape') as ShapeType
    const limit = parseInt(searchParams.get('limit') || '20')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null

    // 특정 도형 필터가 있는 경우 검증
    if (shape && !Object.values(SHAPES).includes(shape)) {
      return NextResponse.json(
        { error: 'Invalid shape parameter' },
        { status: 400 }
      )
    }

    // 기본 쿼리 구성
    let query = supabaseServer
      .from('hall_of_fame')
      .select(`
        id,
        shape,
        champion_score,
        ranking_year,
        ranking_month,
        achieved_at,
        users (
          nickname
        )
      `)
      .order('ranking_year', { ascending: false })
      .order('ranking_month', { ascending: false })
      .limit(Math.min(limit, 100)) // 최대 100개로 제한

    // 도형 필터 적용
    if (shape) {
      query = query.eq('shape', shape)
    }

    // 연도 필터 적용
    if (year) {
      query = query.eq('ranking_year', year)
    }

    const { data: hallOfFameData, error } = await query

    if (error) {
      console.error('Error fetching hall of fame:', error)
      return NextResponse.json(
        { error: 'Failed to fetch hall of fame' },
        { status: 500 }
      )
    }

    // 데이터 형식 변환
    const hallOfFame = hallOfFameData.map((item: any) => ({
      id: item.id,
      shape: item.shape,
      championScore: item.champion_score,
      rankingYear: item.ranking_year,
      rankingMonth: item.ranking_month,
      monthDisplay: `${item.ranking_year}-${String(item.ranking_month).padStart(2, '0')}`,
      championNickname: item.users?.nickname || 'Anonymous',
      achievedAt: item.achieved_at
    }))

    // 연도별 통계 정보 추가 생성
    const yearStats = await getYearStats(shape)

    return NextResponse.json({
      hallOfFame,
      yearStats,
      totalRecords: hallOfFame.length,
      currentMonth: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      }
    })

  } catch (error) {
    console.error('Hall of fame API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 연도별 통계 정보 조회
async function getYearStats(shape?: ShapeType) {
  try {
    let query = supabaseServer
      .from('hall_of_fame')
      .select('ranking_year, shape, champion_score')

    if (shape) {
      query = query.eq('shape', shape)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    // 연도별로 그룹화하고 통계 계산
    const yearMap = new Map()

    data.forEach((record: any) => {
      const year = record.ranking_year
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          totalMonths: 0,
          shapes: new Set(),
          highestScore: 0,
          averageScore: 0,
          totalScore: 0
        })
      }

      const yearStat = yearMap.get(year)
      yearStat.totalMonths++
      yearStat.shapes.add(record.shape)
      yearStat.highestScore = Math.max(yearStat.highestScore, record.champion_score)
      yearStat.totalScore += record.champion_score
    })

    // 평균 계산 및 최종 형태로 변환
    return Array.from(yearMap.values())
      .map(stat => ({
        year: stat.year,
        totalMonths: stat.totalMonths,
        uniqueShapes: stat.shapes.size,
        highestScore: Number(stat.highestScore.toFixed(3)),
        averageScore: Number((stat.totalScore / stat.totalMonths).toFixed(3))
      }))
      .sort((a, b) => b.year - a.year)

  } catch (error) {
    console.error('Error getting year stats:', error)
    return []
  }
}

