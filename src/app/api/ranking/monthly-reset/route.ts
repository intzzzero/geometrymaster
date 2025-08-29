import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 월간 랭킹 초기화 API (매월 1일 실행 예정)
export async function POST(request: NextRequest) {
  try {
    // API 키 인증 (보안을 위해)
    const authHeader = request.headers.get('authorization')
    const expectedApiKey = process.env.MONTHLY_RESET_API_KEY
    
    if (!expectedApiKey || authHeader !== `Bearer ${expectedApiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting monthly ranking reset...')

    // 월간 럭킹 초기화 함수 실행
    const { error } = await supabaseServer
      .rpc('initialize_monthly_ranking')

    if (error) {
      console.error('Error initializing monthly ranking:', error)
      return NextResponse.json(
        { error: 'Failed to initialize monthly ranking', details: error.message },
        { status: 500 }
      )
    }

    // 현재 월 정보 조회
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    // 초기화 결과 로그
    console.log(`Monthly ranking initialized successfully for ${currentMonth}/${currentYear}`)

    return NextResponse.json({
      success: true,
      message: 'Monthly ranking initialized successfully',
      currentMonth: {
        year: currentYear,
        month: currentMonth
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Monthly reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 수동 초기화를 위한 GET 엔드포인트 (개발/테스트용)
export async function GET() {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    const { error } = await supabaseServer
      .rpc('initialize_monthly_ranking')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to initialize monthly ranking', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly ranking initialized (development mode)',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Manual monthly reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}