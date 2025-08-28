'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavigationProps {
  user: { id: string; nickname: string; needsNickname: boolean } | null
  onSignIn: () => void
  onSignOut: () => void
  onSignInRedirect?: () => void
}

export default function Navigation({ user, onSignIn, onSignOut, onSignInRedirect }: NavigationProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  return (
    <nav className="bg-white shadow-sm border-b border-[--color-toss-gray-200] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <Link href="/" className="cursor-pointer">
              <h1 className="text-xl font-bold text-[--color-toss-gray-900] hover:text-[--color-toss-blue] transition-colors">
                GeometryMaster
              </h1>
            </Link>
          </div>

          <div className="flex-1"></div>

          {/* 사용자 메뉴 */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center">
                <a 
                  href="/ranking" 
                  className="px-4 py-2 text-sm text-[--color-toss-gray-600] hover:text-[--color-toss-blue] font-medium transition-colors cursor-pointer border-r border-[--color-toss-gray-200]"
                >
                  Rankings
                </a>
                <div 
                  className="relative"
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <span className="px-4 py-2 text-sm text-[--color-toss-gray-800] font-medium transition-colors cursor-pointer hover:text-[--color-toss-blue]">
                    {user.nickname}
                  </span>
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-[--radius-toss] shadow-[--shadow-toss-lg] border border-[--color-toss-gray-200] py-1 min-w-[120px] z-50">
                      <button
                        onClick={onSignOut}
                        className="w-full px-4 py-2 text-left text-sm text-[--color-toss-gray-600] hover:text-[--color-toss-gray-800] hover:bg-[--color-toss-gray-50] transition-colors cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <a 
                  href="/ranking" 
                  className="px-4 py-2 text-sm text-[--color-toss-gray-600] hover:text-[--color-toss-blue] font-medium transition-colors cursor-pointer border-r border-[--color-toss-gray-200]"
                >
                  Rankings
                </a>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={onSignIn}
                    className="btn-secondary text-sm px-3 py-2 !text-black hover:!text-black"
                    title="팝업 로그인"
                  >
                    Login (Popup)
                  </button>
                  {onSignInRedirect && (
                    <button
                      onClick={onSignInRedirect}
                      className="btn-primary text-sm px-3 py-2 !text-black hover:!text-black"
                      title="리디렉션 로그인"
                    >
                      Login (Redirect)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}