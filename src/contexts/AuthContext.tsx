'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface User {
  id: string
  google_uid: string
  nickname: string
  email?: string
  needsNickname: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGoogleRedirect: () => void
  signOut: () => void
  updateNickname: (nickname: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 페이지 로드 시 로컬 스토리지에서 사용자 정보 복원
    const savedUser = localStorage.getItem('geometrymaster_user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error('Failed to parse saved user:', error)
        localStorage.removeItem('geometrymaster_user')
      }
    }
    setIsLoading(false)

    // 리디렉션 로그인을 위한 메시지 리스너 추가
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.user) {
        const userWithFlag = {
          ...event.data.user,
          needsNickname: !event.data.user.nickname || 
                         event.data.user.nickname.startsWith('사용자') ||
                         event.data.user.nickname === event.data.user.email?.split('@')[0]
        }
        setUser(userWithFlag)
        localStorage.setItem('geometrymaster_user', JSON.stringify(userWithFlag))
      }
    }

    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)

      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        throw new Error('Google Client ID not found')
      }

      // Google OAuth 플로우 시작
      const redirectUri = `${window.location.origin}/auth/callback`
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid profile email&` +
        `access_type=offline&` +
        `prompt=select_account`


      // 팝업으로 Google 인증 페이지 열기
      const popup = window.open(
        googleAuthUrl,
        'google-signin',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('팝업이 차단되었습니다. 팝업을 허용해주세요.')
      }

      // 팝업에서 메시지 받기
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          const { code } = event.data
          popup?.close()

          try {
            // 인증 코드를 백엔드로 전송
            const response = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code })
            })

            if (!response.ok) {
              throw new Error('Authentication failed')
            }

            const { user: newUser } = await response.json()
            
            // 닉네임이 자동 생성된 경우 수정 필요 플래그 설정
            const userWithFlag = {
              ...newUser,
              needsNickname: !newUser.nickname || newUser.nickname.startsWith('사용자')
            }

            setUser(userWithFlag)
            localStorage.setItem('geometrymaster_user', JSON.stringify(userWithFlag))
          } catch (error) {
            console.error('Authentication error:', error)
            alert('로그인에 실패했습니다. 다시 시도해주세요.')
          }

          window.removeEventListener('message', handleMessage)
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          popup?.close()
          console.error('Google auth error:', event.data.error)
          alert('Google 인증에 실패했습니다.')
          window.removeEventListener('message', handleMessage)
        }
      }

      window.addEventListener('message', handleMessage)

      // 팝업이 닫혔는지 체크
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setIsLoading(false)
        }
      }, 1000)

    } catch (error) {
      console.error('Sign in error:', error)
      alert('로그인 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const signInWithGoogleRedirect = () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      alert('Google Client ID not configured')
      return
    }

    const redirectUri = `${window.location.origin}/auth/callback`
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid profile email&` +
      `access_type=offline&` +
      `prompt=select_account`

    window.location.href = googleAuthUrl
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('geometrymaster_user')
  }

  const updateNickname = async (nickname: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          nickname 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update nickname')
      }

      const updatedUser = { 
        ...user, 
        nickname, 
        needsNickname: false 
      }
      
      setUser(updatedUser)
      localStorage.setItem('geometrymaster_user', JSON.stringify(updatedUser))
    } catch (error) {
      console.error('Update nickname error:', error)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signOut,
    updateNickname
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}