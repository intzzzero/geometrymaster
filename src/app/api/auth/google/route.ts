import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    // Google OAuth 토큰으로 사용자 정보 가져오기
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
    const googleUser = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    // Supabase 사용자 조회 또는 생성
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('*')
      .eq('google_uid', googleUser.id)
      .single()

    let user
    if (existingUser) {
      user = existingUser
    } else {
      // 새 사용자 생성
      const { data: newUser, error } = await supabaseServer
        .from('users')
        .insert({
          google_uid: googleUser.id,
          email: googleUser.email,
          nickname: googleUser.name || `사용자${googleUser.id.slice(-4)}`
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      user = newUser
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}