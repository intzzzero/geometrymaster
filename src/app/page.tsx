'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SHAPES } from '@/lib/supabase-client'
import Navigation from '@/components/Navigation'

// Temporary mock authentication (will be implemented later)
const mockUser = { id: '1', nickname: 'TestUser', needsNickname: false }

export default function Home() {
  const [user, setUser] = useState<typeof mockUser | null>(mockUser) // Temporary mock
  const [showShapeSelector, setShowShapeSelector] = useState(false)
  const router = useRouter()

  const shapes = [
    { key: SHAPES.CIRCLE, name: 'Circle', emoji: '⭕' },
    { key: SHAPES.STAR5, name: 'Star', emoji: '⭐' },
    { key: SHAPES.SQUARE, name: 'Square', emoji: '🟦' },
    { key: SHAPES.TRIANGLE, name: 'Triangle', emoji: '🔺' }
  ]

  const handleStartGame = () => {
    setShowShapeSelector(true)
  }

  const handleShapeSelect = (shape: string) => {
    router.push(`/game/${shape}`)
  }

  const signInWithGoogle = () => {
    // Temporary - will implement actual Google OAuth later
    setUser(mockUser)
  }

  const signOut = () => {
    setUser(null)
  }

  return (
    <div className="min-h-screen bg-[--color-toss-gray-50]">
      <Navigation user={user} onSignIn={signInWithGoogle} onSignOut={signOut} />
      
      <div className="flex items-center justify-center p-4 pt-16">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[--color-toss-gray-900] mb-3">
              GeometryMaster
            </h1>
            <p className="text-lg text-[--color-toss-gray-600] font-medium">
              Draw. Score. Master it.
            </p>
          </div>

          <div className="card-toss mb-6">
            {!user ? (
              <div className="text-center">
                <div className="mb-6">
                  <p className="text-[--color-toss-gray-800] text-lg font-medium mb-2">
                    Test your shape drawing skills
                  </p>
                  <p className="text-[--color-toss-gray-600]">
                    Get scores based on accuracy and challenge the rankings!
                  </p>
                </div>

                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[--radius-toss]">
                  <p className="text-sm text-red-600 font-medium mb-2">
                    ⚠️ Guest Mode Game Play
                  </p>
                  <div className="text-sm text-red-500 space-y-1">
                    <p>
                      You can play the game, but <strong>scores won&apos;t be saved</strong> and won&apos;t appear in rankings.
                    </p>
                    <p className="text-red-600 font-medium mt-2">
                      Please log in to save your scores.
                    </p>
                  </div>
                </div>

                {!showShapeSelector ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleStartGame}
                      className="btn-secondary w-full text-base py-4"
                    >
                      Start Game (Trial)
                    </button>
                    <p className="text-sm text-[--color-toss-gray-600]">
                      Click the login button above to save scores
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[--color-toss-gray-800] font-medium">Select a shape</p>
                    <div className="grid grid-cols-2 gap-3">
                      {shapes.map((shape) => (
                        <button
                          key={shape.key}
                          onClick={() => handleShapeSelect(shape.key)}
                          className="flex flex-col items-center p-4 rounded-[--radius-toss] border-2 border-[--color-toss-gray-200] hover:border-[--color-toss-blue] hover:bg-[--color-toss-blue-light] hover:scale-105 transition-all duration-200 cursor-pointer"
                        >
                          <span className="text-3xl mb-2">{shape.emoji}</span>
                          <span className="text-sm font-medium text-[--color-toss-gray-800]">
                            {shape.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowShapeSelector(false)}
                      className="btn-secondary w-full"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[--color-toss-gray-900] mb-2">
                    Hello, {user.nickname}! 👋
                  </h2>
                  <p className="text-[--color-toss-gray-600]">
                    Which shape would you like to challenge?
                  </p>
                </div>

                {!showShapeSelector ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleStartGame}
                      className="btn-secondary w-full text-base py-4"
                    >
                      Start Game
                    </button>
                    <button
                      onClick={() => router.push('/ranking')}
                      className="btn-secondary w-full text-base py-4"
                    >
                      View Rankings
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[--color-toss-gray-800] font-medium">Select a shape</p>
                    <div className="grid grid-cols-2 gap-3">
                      {shapes.map((shape) => (
                        <button
                          key={shape.key}
                          onClick={() => handleShapeSelect(shape.key)}
                          className="flex flex-col items-center p-4 rounded-[--radius-toss] border-2 border-[--color-toss-gray-200] hover:border-[--color-toss-blue] hover:bg-[--color-toss-blue-light] hover:scale-105 transition-all duration-200 cursor-pointer"
                        >
                          <span className="text-3xl mb-2">{shape.emoji}</span>
                          <span className="text-sm font-medium text-[--color-toss-gray-800]">
                            {shape.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowShapeSelector(false)}
                      className="btn-secondary w-full"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
