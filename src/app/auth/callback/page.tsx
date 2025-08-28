'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function AuthCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Processing authentication...')

  useEffect(() => {
    const processAuth = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')


      if (error) {
        console.error('OAuth error:', error)
        setStatus('error')
        setMessage(`Authentication failed: ${error}`)
        
        // 팝업인지 확인
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error
          }, window.location.origin)
          window.close()
          return
        }
        
        // 직접 리디렉션인 경우 3초 후 홈으로
        setTimeout(() => router.push('/'), 3000)
        return
      }

      if (code) {
        try {
          
          const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          })


          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Authentication failed')
          }

          const { user } = await response.json()

          const userWithFlag = {
            ...user,
            needsNickname: !user.nickname || user.nickname.startsWith('사용자') || user.nickname === user.email?.split('@')[0]
          }

          // 팝업인지 확인
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              user: userWithFlag
            }, window.location.origin)
            window.close()
            return
          }

          // 직접 리디렉션인 경우 메시지를 보내고 홈으로
          window.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            user: userWithFlag
          }, window.location.origin)
          
          setStatus('success')
          setMessage('Authentication successful! Redirecting...')
          setTimeout(() => router.push('/'), 1000)

        } catch (error) {
          console.error('Auth processing error:', error)
          setStatus('error')
          setMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: error instanceof Error ? error.message : 'Unknown error'
            }, window.location.origin)
            window.close()
            return
          }

          setTimeout(() => router.push('/'), 3000)
        }
      } else {
        setStatus('error')
        setMessage('No authorization code received')
        setTimeout(() => router.push('/'), 3000)
      }
    }

    processAuth()
  }, [searchParams, router])

  return (
    <div className="h-screen flex items-center justify-center bg-[--color-toss-gray-50] overflow-hidden">
      <div className="text-center">
        {status === 'loading' && (
          <div className="w-8 h-8 border-4 border-[--color-toss-blue] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        )}
        {status === 'success' && (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-sm">✓</span>
          </div>
        )}
        {status === 'error' && (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-sm">✗</span>
          </div>
        )}
        <p className={`text-sm ${
          status === 'error' ? 'text-red-600' : 
          status === 'success' ? 'text-green-600' : 
          'text-[--color-toss-gray-600]'
        }`}>
          {message}
        </p>
        {status === 'error' && (
          <p className="text-xs text-gray-500 mt-2">
            Redirecting to home page in 3 seconds...
          </p>
        )}
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[--color-toss-gray-50] overflow-hidden">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[--color-toss-blue] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[--color-toss-gray-600]">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}