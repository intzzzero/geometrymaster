import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { OAuth2Client } from 'google-auth-library'

const getCallbackUrl = (request?: NextRequest) => {
  // 요청에서 실제 origin 확인
  if (request) {
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/')
    if (origin) {
      console.log('Using origin from request headers:', origin)
      return `${origin}/auth/callback`
    }
  }
  
  // 환경 변수 fallback
  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}/auth/callback`
    console.log('Using VERCEL_URL:', url)
    return url
  }
  if (process.env.NEXTAUTH_URL) {
    console.log('Using NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    return `${process.env.NEXTAUTH_URL}/auth/callback`
  }
  
  console.log('Falling back to localhost')
  return 'http://localhost:3000/auth/callback'
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Google OAuth API Request Started ===')
    console.log('Environment variables check:', {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasVercelUrl: !!process.env.VERCEL_URL,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV
    })
    
    const { code } = await request.json()
    
    const callbackUrl = getCallbackUrl(request)
    console.log('Auth API - Callback URL:', callbackUrl)
    console.log('Auth API - Request Headers:', {
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent')
    })

    // 환경 변수 검증
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing required Google OAuth environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // 동적 OAuth2Client 생성
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl
    )

    if (!code) {
      console.error('No authorization code provided')
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    console.log('Step 1: Starting Google OAuth token exchange...')
    console.log('Using callback URL:', callbackUrl)
    console.log('Authorization code length:', code.length)
    console.log('Google Client ID (masked):', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...')
    
    // invalid_request 오류 디버깅을 위해 여러 callback URL 시도
    const possibleCallbackUrls = [
      callbackUrl,
      'https://geometrymaster.xyz/auth/callback',
      `https://${request.headers.get('host')}/auth/callback`
    ].filter((url, index, array) => array.indexOf(url) === index)
    
    console.log('Possible callback URLs to try:', possibleCallbackUrls)
    
    // Google OAuth 코드로 토큰 교환
    let tokens
    let lastError
    
    // 여러 callback URL로 시도
    for (let i = 0; i < possibleCallbackUrls.length; i++) {
      const tryCallbackUrl = possibleCallbackUrls[i]
      console.log(`Token exchange attempt ${i + 1} with URL:`, tryCallbackUrl)
      
      const tryClient = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        tryCallbackUrl
      )
      
      try {
        const result = await tryClient.getToken(code)
        tokens = result.tokens
        console.log(`Step 2: Token exchange successful on attempt ${i + 1}!, tokens received:`, !!tokens.access_token)
        break
      } catch (tokenError) {
        lastError = tokenError
        console.error(`Token exchange attempt ${i + 1} failed:`, tokenError instanceof Error ? tokenError.message : tokenError)
      }
    }
    
    if (!tokens && lastError) {
      console.error('Step 2 ERROR: All token exchange attempts failed:', lastError)
      console.error('Detailed token error:', {
        message: lastError instanceof Error ? lastError.message : lastError,
        stack: lastError instanceof Error ? lastError.stack : undefined,
        triedCallbackUrls: possibleCallbackUrls,
        code: code?.substring(0, 20) + '...' // 보안을 위해 코드 일부만 표시
      })
      
      // Google API 응답에서 더 구체적인 오류 메시지 추출
      let errorMessage = 'Unknown token exchange error'
      if (lastError instanceof Error) {
        if (lastError.message.includes('invalid_request')) {
          errorMessage = 'invalid_request - Callback URL이 Google Cloud Console에 등록되지 않음'
        } else if (lastError.message.includes('invalid_client')) {
          errorMessage = 'invalid_client - Client ID/Secret 오류'
        } else if (lastError.message.includes('invalid_grant')) {
          errorMessage = 'invalid_grant - 만료된 또는 잘못된 authorization code'
        } else {
          errorMessage = lastError.message
        }
      }
      
      return NextResponse.json(
        { 
          error: `Token exchange failed: ${errorMessage}`,
          details: {
            message: 'Google Cloud Console에서 다음 URL들을 승인된 리디렉션 URI에 추가하세요',
            urls: possibleCallbackUrls
          }
        },
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
      callbackUrl: getCallbackUrl(request)
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}