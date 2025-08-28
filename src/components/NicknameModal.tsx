'use client'

import { useState } from 'react'

interface NicknameModalProps {
  isOpen: boolean
  currentNickname: string
  onSave: (nickname: string) => Promise<void>
  onCancel: () => void
}

export default function NicknameModal({ isOpen, currentNickname, onSave, onCancel }: NicknameModalProps) {
  const [nickname, setNickname] = useState(currentNickname)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedNickname = nickname.trim()
    
    // Validation
    if (!trimmedNickname) {
      setError('Please enter a nickname.')
      return
    }
    
    if (trimmedNickname.length < 2) {
      setError('Nickname must be at least 2 characters long.')
      return
    }
    
    if (trimmedNickname.length > 20) {
      setError('Nickname must be 20 characters or less.')
      return
    }

    // Special character check (Korean, English, numbers, spaces only)
    if (!/^[가-힣a-zA-Z0-9\s]+$/.test(trimmedNickname)) {
      setError('Only Korean, English letters, and numbers are allowed.')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      await onSave(trimmedNickname)
    } catch (err) {
      console.error('Failed to save nickname:', err)
      setError('Failed to save nickname. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setNickname(currentNickname)
    setError(null)
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[--radius-toss-xl] p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[--color-toss-gray-900] mb-2">
            Set Nickname
          </h2>
          <p className="text-[--color-toss-gray-600]">
            Please set a nickname to use in the game
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-[--color-toss-gray-800] mb-2">
              Nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setError(null)
              }}
              className="w-full px-4 py-3 border-2 border-[--color-toss-gray-200] rounded-[--radius-toss] 
                         focus:border-[--color-toss-blue] focus:outline-none transition-colors
                         text-[--color-toss-gray-900] placeholder-[--color-toss-gray-500]"
              placeholder="Enter your nickname"
              maxLength={20}
              autoFocus
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-[--color-toss-gray-500]">
                2-20 characters, Korean/English/Numbers only
              </span>
              <span className="text-xs text-[--color-toss-gray-500]">
                {nickname.length}/20
              </span>
            </div>
            
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-[--radius-toss] text-red-600 text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 py-3 px-6 border-2 border-[--color-toss-gray-200] rounded-[--radius-toss] 
                         text-[--color-toss-gray-600] font-medium hover:bg-[--color-toss-gray-50] 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !nickname.trim()}
              className="flex-1 py-3 px-6 border-2 border-[--color-toss-gray-200] rounded-[--radius-toss] 
                         text-[--color-toss-gray-600] font-medium hover:bg-[--color-toss-gray-50] 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[--color-toss-gray-600] border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-[--color-toss-blue-light] rounded-[--radius-toss] text-sm text-[--color-toss-gray-700">
          <p className="font-medium mb-1">💡 Information</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Your nickname will be displayed on the rankings</li>
            <li>You can change it later in your profile</li>
            <li>Inappropriate nicknames may be subject to restrictions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}