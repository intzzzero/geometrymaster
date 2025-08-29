'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NavigationProps {
	user: { id: string; nickname: string } | null;
	onSignIn: () => void;
	onSignOut: () => void;
	onSignInRedirect?: () => void;
	onChangeNickname?: () => void;
}

export default function Navigation({
	user,
	onSignIn,
	onSignOut,
	onSignInRedirect,
	onChangeNickname,
}: NavigationProps) {
	const [showDropdown, setShowDropdown] = useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	
	return (
		<nav className="bg-white shadow-sm border-b border-[--color-toss-gray-200] fixed top-0 left-0 right-0 z-50">
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

					{/* 데스크톱 메뉴 */}
					<div className="hidden md:flex items-center">
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
										<div className="absolute right-0 top-full mt-1 bg-white rounded-[--radius-toss] shadow-[--shadow-toss-lg] border border-[--color-toss-gray-200] py-1 min-w-[150px] z-50">
											{onChangeNickname && (
												<button
													onClick={() => {
														onChangeNickname();
														setShowDropdown(false);
													}}
													className="w-full px-4 py-2 text-left text-sm text-[--color-toss-gray-600] hover:text-[--color-toss-gray-800] hover:bg-[--color-toss-gray-50] transition-colors cursor-pointer"
												>
													Change Nickname
												</button>
											)}
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
								<div className="flex items-center ml-4">
									{onSignInRedirect ? (
										<button
											onClick={onSignInRedirect}
											className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
										>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
												<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
												<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
												<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
												<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
											</svg>
											Login
										</button>
									) : (
										<button
											onClick={onSignIn}
											className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
										>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
												<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
												<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
												<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
												<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
											</svg>
											Login
										</button>
									)}
								</div>
							</div>
						)}
					</div>

					{/* 모바일 햄버거 버튼 */}
					<div className="md:hidden">
						<button
							onClick={() => setShowMobileMenu(!showMobileMenu)}
							className="p-2 rounded-[--radius-toss] text-[--color-toss-gray-600] hover:text-[--color-toss-blue] hover:bg-[--color-toss-gray-50] transition-colors"
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								{showMobileMenu ? (
									<path d="M18 6L6 18M6 6l12 12" />
								) : (
									<>
										<line x1="4" y1="6" x2="20" y2="6" />
										<line x1="4" y1="12" x2="20" y2="12" />
										<line x1="4" y1="18" x2="20" y2="18" />
									</>
								)}
							</svg>
						</button>
					</div>
				</div>
				
				{/* 모바일 메뉴 드롭다운 */}
				{showMobileMenu && (
					<div className="md:hidden border-t border-[--color-toss-gray-200] bg-white">
						<div className="px-4 py-2 space-y-1">
							<a
								href="/ranking"
								className="block px-3 py-2 text-sm text-[--color-toss-gray-600] hover:text-[--color-toss-blue] hover:bg-[--color-toss-gray-50] rounded-[--radius-toss] transition-colors"
								onClick={() => setShowMobileMenu(false)}
							>
								Rankings
							</a>
							{user ? (
								<>
									<div className="px-3 py-2 text-sm text-[--color-toss-gray-800] font-medium border-t border-[--color-toss-gray-200] mt-2 pt-3">
										{user.nickname}
									</div>
									{onChangeNickname && (
										<button
											onClick={() => {
												onChangeNickname();
												setShowMobileMenu(false);
											}}
											className="block w-full text-left px-3 py-2 text-sm text-[--color-toss-gray-600] hover:text-[--color-toss-blue] hover:bg-[--color-toss-gray-50] rounded-[--radius-toss] transition-colors"
										>
											Change Nickname
										</button>
									)}
									<button
										onClick={() => {
											onSignOut();
											setShowMobileMenu(false);
										}}
										className="block w-full text-left px-3 py-2 text-sm text-[--color-toss-gray-600] hover:text-[--color-toss-blue] hover:bg-[--color-toss-gray-50] rounded-[--radius-toss] transition-colors"
									>
										Logout
									</button>
								</>
							) : (
								<button
									onClick={() => {
										if (onSignInRedirect) {
											onSignInRedirect();
										} else {
											onSignIn();
										}
										setShowMobileMenu(false);
									}}
									className="block w-full text-left px-3 py-2 text-sm text-[--color-toss-blue] hover:bg-[--color-toss-blue-light] rounded-[--radius-toss] font-medium transition-colors flex items-center gap-2"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
										<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
										<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
										<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
										<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
									</svg>
									Login
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</nav>
	);
}
