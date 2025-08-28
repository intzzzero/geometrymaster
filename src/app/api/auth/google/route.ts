import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { OAuth2Client } from 'google-auth-library'

const getCallbackUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/auth/callback`
  }
  if (process.env.NEXTAUTH_URL) {
    return `${process.env.NEXTAUTH_URL}/auth/callback`
  }
  return 'http://localhost:3000/auth/callback'
}

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getCallbackUrl()
)

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    console.log('Auth API - Callback URL:', getCallbackUrl())
    console.log('Auth API - Environment:', {
      VERCEL_URL: process.env.VERCEL_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV
    })

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    console.log('Step 1: Starting Google OAuth token exchange...')
    console.log('Using callback URL:', getCallbackUrl())
    
    // Google OAuth 코드로 토큰 교환
    let tokens
    try {
      const result = await client.getToken(code)
      tokens = result.tokens
      console.log('Step 2: Token exchange successful, tokens received:', !!tokens.access_token)
    } catch (tokenError) {
      console.error('Step 2 ERROR: Token exchange failed:', tokenError)
      return NextResponse.json(
        { error: `Token exchange failed: ${tokenError instanceof Error ? tokenError.message : tokenError}` },
        { status: 401 }
      )
    }
    
    if (!tokens.access_token) {
      console.error('Step 2 ERROR: No access token received')
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 401 }
      )
    }

    console.log('Step 3: Fetching user info from Google...')
    // 액세스 토큰으로 사용자 정보 가져오기
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`)
    const googleUser = await response.json()
    console.log('Step 4: Google user info received:', { id: googleUser.id, email: googleUser.email })

    if (!response.ok) {
      console.error('Step 4 ERROR: Failed to fetch user info from Google:', response.status, googleUser)
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    console.log('Step 5: Checking for existing user in Supabase...')
    // Supabase 사용자 조회 또는 생성
    const { data: existingUser, error: selectError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('google_uid', googleUser.id)
      .single()

    console.log('Step 6: Supabase query result:', { 
      existingUser: !!existingUser, 
      selectError: selectError?.message 
    })

    let user
    if (existingUser && !selectError) {
      console.log('Step 7: Using existing user')
      user = existingUser
    } else {
      console.log('Step 8: Creating new user...')
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

      console.log('Step 9: User creation result:', { 
        success: !!newUser, 
        insertError: insertError?.message 
      })

      if (insertError) {
        console.error('Step 9 ERROR: Database insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      user = newUser
    }

    console.log('Step 10: Authentication successful, returning user')
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      callbackUrl: getCallbackUrl()
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}