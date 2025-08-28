import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { OAuth2Client } from 'google-auth-library'

const getCallbackUrl = (request?: NextRequest) => {
  // 요청에서 실제 origin 확인
  if (request) {
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/')
    if (origin) {
      return `${origin}/auth/callback`
    }
  }
  
  // 환경 변수 fallback
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/auth/callback`
  }
  if (process.env.NEXTAUTH_URL) {
    return `${process.env.NEXTAUTH_URL}/auth/callback`
  }
  
  return 'http://localhost:3000/auth/callback'
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    const callbackUrl = getCallbackUrl(request)

    // 환경 변수 검증
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // Google OAuth 클라이언트 생성 및 토큰 교환
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl
    )

    let tokens
    try {
      const result = await client.getToken(code)
      tokens = result.tokens
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError instanceof Error ? tokenError.message : tokenError)
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 401 }
      )
    }
    
    if (!tokens?.access_token) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 401 }
      )
    }

    // 사용자 정보 가져오기
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`)
    const googleUser = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    // Supabase에서 사용자 조회 또는 생성
    const { data: existingUser, error: selectError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('google_uid', googleUser.id)
      .single()

    let user
    if (existingUser && !selectError) {
      user = existingUser
    } else {
      // 새 사용자 생성
      const { data: newUser, error: insertError } = await supabaseServer
        .from('users')
        .insert({
          google_uid: googleUser.id,
          email: googleUser.email,
          nickname: googleUser.name || `사용자${googleUser.id.slice(-4)}`
        })
        .select()
        .single()

      if (insertError) {
        console.error('Database insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      user = newUser
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}