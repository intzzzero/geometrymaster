'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SHAPES } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'

interface RankingItem {
  rank: number
  nickname: string
  score: number
  updatedAt: string
}

export default function RankingPage() {
  const [selectedShape, setSelectedShape] = useState<typeof SHAPES[keyof typeof SHAPES]>(SHAPES.CIRCLE)
  const [rankings, setRankings] = useState<RankingItem[]>([])
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
        const response = await fetch(`/api/ranking?shape=${selectedShape}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch rankings')
        }
        
        const data = await response.json()
        setRankings(data.ranking || [])
      } catch (err) {
        console.error('Failed to fetch rankings:', err)
        setError('Failed to load rankings')
        setRankings([])
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [selectedShape])

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
                  {rankings.map((item) => (
                    <div
                      key={item.rank}
                      className={`flex items-center justify-between p-4 rounded-[--radius-toss] ${
                        item.rank <= 3 
                          ? 'bg-white border-2 border-[--color-toss-blue-light]' 
                          : 'bg-white border border-[--color-toss-gray-200]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-bold min-w-[60px]">
                          {getRankIcon(item.rank)}
                        </div>
                        <div>
                          <p className="font-semibold text-[--color-toss-gray-900]">
                            {item.nickname}
                          </p>
                          <p className="text-xs text-[--color-toss-gray-500]">
                            {item.updatedAt}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[--color-toss-blue]">
                          {item.score} pts
                        </p>
                      </div>
                    </div>
                  ))}
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