'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SHAPES } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'

interface RankingItem {
  rank: number
  userId: string
  nickname: string
  score: number
  updatedAt: string
}

interface RankingResponse {
  ranking: RankingItem[]
  userRank: number | null
  userInfo: RankingItem | null
}

export default function RankingPage() {
  const [selectedShape, setSelectedShape] = useState<typeof SHAPES[keyof typeof SHAPES]>(SHAPES.CIRCLE)
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [userInfo, setUserInfo] = useState<RankingItem | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, signInWithGoogle, signInWithGoogleRedirect, signOut } = useAuth()
  const router = useRouter()

  const shapes = [
    { key: SHAPES.CIRCLE, name: 'Circle', emoji: '⭕' },
    { key: SHAPES.STAR5, name: 'Star', emoji: '⭐' },
    { key: SHAPES.SQUARE, name: 'Square', emoji: '🟦' },
    { key: SHAPES.TRIANGLE, name: 'Triangle', emoji: '🔺' }
  ]

  // 랭킹 페이지에서는 스크롤 허용
  useEffect(() => {
    document.body.classList.add('allow-scroll')
    return () => {
      document.body.classList.remove('allow-scroll')
    }
  }, [])

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const url = new URL('/api/ranking', window.location.origin)
        url.searchParams.set('shape', selectedShape)
        if (user?.id) {
          url.searchParams.set('userId', user.id)
        }
        
        const response = await fetch(url.toString())
        
        if (!response.ok) {
          throw new Error('Failed to fetch rankings')
        }
        
        const data: RankingResponse = await response.json()
        setRankings(data.ranking || [])
        setUserInfo(data.userInfo)
        setUserRank(data.userRank)
      } catch (err) {
        console.error('Failed to fetch rankings:', err)
        setError('Failed to load rankings')
        setRankings([])
        setUserInfo(null)
        setUserRank(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [selectedShape, user?.id])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  return (
    <div className="min-h-screen bg-[--color-toss-gray-50]">
      <Navigation 
        user={user} 
        onSignIn={signInWithGoogle} 
        onSignInRedirect={signInWithGoogleRedirect}
        onSignOut={signOut} 
      />
      
      <div className="flex items-center justify-center p-4 pt-16">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[--color-toss-gray-900] mb-3">
              Rankings
            </h1>
            <p className="text-lg text-[--color-toss-gray-600] font-medium">
              Check the top records for each shape
            </p>
          </div>

          <div className="card-toss mb-6">
            <div className="text-center mb-6">
              <p className="text-[--color-toss-gray-800] font-medium mb-4">Select a shape</p>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {shapes.map((shape) => (
                  <button
                    key={shape.key}
                    onClick={() => setSelectedShape(shape.key)}
                    className={`flex flex-col items-center p-4 rounded-[--radius-toss] border-2 transition-all duration-200 cursor-pointer ${
                      selectedShape === shape.key 
                        ? 'border-black bg-black text-white scale-105 shadow-[--shadow-toss-button]' 
                        : 'border-[--color-toss-gray-200] bg-white hover:border-[--color-toss-blue] hover:bg-[--color-toss-blue-light] hover:scale-105'
                    }`}
                  >
                    <span className="text-3xl mb-2">{shape.emoji}</span>
                    <span className={`text-sm font-medium ${
                      selectedShape === shape.key 
                        ? 'text-white' 
                        : 'text-[--color-toss-gray-800]'
                    }`}>
                      {shape.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[--color-toss-gray-50] rounded-[--radius-toss-lg] p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-[--color-toss-blue] border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-[--color-toss-gray-600]">Loading rankings...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-2">⚠️ {error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : rankings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[--color-toss-gray-600]">No records yet</p>
                  <p className="text-sm text-[--color-toss-gray-500] mt-2">
                    Be the first to set a record!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 상위 5위 */}
                  {rankings.map((item) => {
                    const isCurrentUser = user && item.userId === user.id
                    return (
                      <div
                        key={item.rank}
                        className={`flex items-center justify-between p-4 rounded-[--radius-toss] ${
                          isCurrentUser
                            ? 'bg-white border-2 border-[--color-toss-blue] ring-2 ring-[--color-toss-blue]/20' 
                            : item.rank <= 3 
                              ? 'bg-white border-2 border-[--color-toss-blue-light]' 
                              : 'bg-white border border-[--color-toss-gray-200]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-bold min-w-[60px]">
                            {getRankIcon(item.rank)}
                          </div>
                          <div>
                            <p className={`font-semibold ${
                              isCurrentUser 
                                ? 'text-[--color-toss-blue]' 
                                : 'text-[--color-toss-gray-900]'
                            }`}>
                              {item.nickname}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs px-2 py-1 bg-[--color-toss-blue] text-white rounded-full">
                                  나
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[--color-toss-gray-500]">
                              {item.updatedAt}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${
                            isCurrentUser 
                              ? 'text-[--color-toss-blue]' 
                              : 'text-[--color-toss-blue]'
                          }`}>
                            {item.score} pts
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* 순위권 밖 사용자 정보 */}
                  {userInfo && userRank && userRank > 5 && (
                    <>
                      <div className="flex items-center my-4">
                        <div className="flex-1 h-px bg-[--color-toss-gray-300]"></div>
                        <span className="px-3 text-sm text-[--color-toss-gray-500]">내 순위</span>
                        <div className="flex-1 h-px bg-[--color-toss-gray-300]"></div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 rounded-[--radius-toss] bg-white border-2 border-[--color-toss-blue] ring-2 ring-[--color-toss-blue]/20">
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-bold min-w-[60px] text-[--color-toss-blue]">
                            #{userInfo.rank}
                          </div>
                          <div>
                            <p className="font-semibold text-[--color-toss-blue]">
                              {userInfo.nickname}
                              <span className="ml-2 text-xs px-2 py-1 bg-[--color-toss-blue] text-white rounded-full">
                                나
                              </span>
                            </p>
                            <p className="text-xs text-[--color-toss-gray-500]">
                              {userInfo.updatedAt}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-[--color-toss-blue]">
                            {userInfo.score} pts
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/')}
                className="btn-secondary px-8 py-3"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}