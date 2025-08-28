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
											className="btn-secondary text-sm px-4 py-2"
										>
											Login
										</button>
									) : (
										<button
											onClick={onSignIn}
											className="btn-secondary text-sm px-4 py-2"
										>
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
									className="block w-full text-left px-3 py-2 text-sm text-[--color-toss-blue] hover:bg-[--color-toss-blue-light] rounded-[--radius-toss] font-medium transition-colors"
								>
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
