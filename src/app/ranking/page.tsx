'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SHAPES } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import NicknameModal from '@/components/NicknameModal';

interface RankingItem {
	rank: number;
	userId: string;
	nickname: string;
	score: number;
	updatedAt: string;
}

interface RankingResponse {
	ranking: RankingItem[];
	userRank: number | null;
	userInfo: RankingItem | null;
}

export default function RankingPage() {
	const [selectedShape, setSelectedShape] = useState<
		(typeof SHAPES)[keyof typeof SHAPES]
	>(SHAPES.CIRCLE);
	const [rankings, setRankings] = useState<RankingItem[]>([]);
	const [userInfo, setUserInfo] = useState<RankingItem | null>(null);
	const [userRank, setUserRank] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showNicknameModal, setShowNicknameModal] = useState(false);
	const { user, signInWithGoogle, signInWithGoogleRedirect, signOut, updateNickname } =
		useAuth();
	const router = useRouter();

	const shapes = [
		{ key: SHAPES.CIRCLE },
		{ key: SHAPES.TRIANGLE },
		{ key: SHAPES.SQUARE },
		{ key: SHAPES.STAR5 },
	];

	// 랭킹 페이지에서는 스크롤 허용
	useEffect(() => {
		document.body.classList.add('allow-scroll');
		return () => {
			document.body.classList.remove('allow-scroll');
		};
	}, []);

	useEffect(() => {
		const fetchRankings = async () => {
			setLoading(true);
			setError(null);

			try {
				const url = new URL('/api/ranking', window.location.origin);
				url.searchParams.set('shape', selectedShape);
				if (user?.id) {
					url.searchParams.set('userId', user.id);
				}

				const response = await fetch(url.toString());

				if (!response.ok) {
					throw new Error('Failed to fetch rankings');
				}

				const data: RankingResponse = await response.json();
				setRankings(data.ranking || []);
				setUserInfo(data.userInfo);
				setUserRank(data.userRank);
			} catch (err) {
				console.error('Failed to fetch rankings:', err);
				setError('Failed to load rankings');
				setRankings([]);
				setUserInfo(null);
				setUserRank(null);
			} finally {
				setLoading(false);
			}
		};

		fetchRankings();
	}, [selectedShape, user?.id]);

	const getRankIcon = (rank: number) => {
		return `#${rank}`;
	};

	const handleNicknameSave = async (nickname: string) => {
		try {
			await updateNickname(nickname);
			setShowNicknameModal(false);
		} catch (error) {
			console.error('닉네임 업데이트 실패:', error);
			throw error;
		}
	};

	const handleNicknameCancel = () => {
		setShowNicknameModal(false);
	};

	return (
		<div className="min-h-screen bg-[--color-toss-gray-50] overflow-auto">
			<Navigation
				user={user}
				onSignIn={signInWithGoogle}
				onSignInRedirect={signInWithGoogleRedirect}
				onSignOut={signOut}
				onChangeNickname={() => setShowNicknameModal(true)}
			/>

			<div className="min-h-[calc(100vh-64px)] flex items-start justify-center p-4 pt-24">
				<div className="max-w-2xl w-full">
					<div className="text-center mb-6">
						<h1 className="text-2xl md:text-3xl font-bold text-[--color-toss-gray-900] mb-2">
							Rankings
						</h1>
						<p className="text-base md:text-lg text-[--color-toss-gray-600] font-medium">
							Check the top records for each shape
						</p>
					</div>

					<div className="card-toss mb-6">
						<div className="text-center mb-4">
							<p className="text-[--color-toss-gray-800] font-medium mb-3">
								Select a shape
							</p>
							<div
								className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-3 max-w-lg mx-auto md:max-w-none"
								id="shape-selector-container"
							>
								{shapes.map((shape) => {
									const isSelected = selectedShape === shape.key;
									const iconColor = isSelected ? 'white' : 'black';

									return (
										<button
											key={shape.key}
											onClick={() => setSelectedShape(shape.key)}
											className={`p-4 rounded-[--radius-toss] border-2 transition-all duration-200 cursor-pointer flex items-center justify-center ${
												isSelected
													? 'border-black bg-black shadow-[--shadow-toss-button]'
													: 'border-[--color-toss-gray-200] bg-white hover:border-[--color-toss-blue] hover:bg-[--color-toss-blue-light]'
											}`}
										>
											{/* SVG 아이콘 직접 렌더링 */}
											{shape.key === SHAPES.CIRCLE && (
												<svg
													width="24"
													height="24"
													viewBox="0 0 24 24"
													fill="none"
												>
													<circle
														cx="12"
														cy="12"
														r="10"
														stroke={iconColor}
														strokeWidth="2"
														fill="none"
													/>
												</svg>
											)}
											{shape.key === SHAPES.TRIANGLE && (
												<svg
													width="24"
													height="24"
													viewBox="0 0 24 24"
													fill="none"
												>
													<path
														d="M12 3l9 18H3l9-18z"
														stroke={iconColor}
														strokeWidth="2"
														fill="none"
													/>
												</svg>
											)}
											{shape.key === SHAPES.SQUARE && (
												<svg
													width="24"
													height="24"
													viewBox="0 0 24 24"
													fill="none"
												>
													<rect
														x="3"
														y="3"
														width="18"
														height="18"
														stroke={iconColor}
														strokeWidth="2"
														fill="none"
													/>
												</svg>
											)}
											{shape.key === SHAPES.STAR5 && (
												<svg
													width="24"
													height="24"
													viewBox="0 0 24 24"
													fill="none"
												>
													<path
														d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"
														stroke={iconColor}
														strokeWidth="2"
														fill="none"
													/>
												</svg>
											)}
										</button>
									);
								})}
							</div>
						</div>

						<div className="bg-[--color-toss-gray-50] rounded-[--radius-toss-lg]">
							{loading ? (
								<div className="text-center py-8">
									<div className="animate-spin w-8 h-8 border-2 border-[--color-toss-blue] border-t-transparent rounded-full mx-auto mb-4"></div>
									<p className="text-[--color-toss-gray-600]">
										Loading rankings...
									</p>
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
								<div className="space-y-2 max-w-lg mx-auto md:max-w-none">
									{/* 상위 10위 */}
									{rankings.map((item) => {
										const isCurrentUser = user && item.userId === user.id;

										// 순위별/사용자별 스타일 계산
										const isTop = item.rank <= 3;
										let borderStyle =
											'bg-white border border-[--color-toss-gray-200]';
										let inlineStyle = {};

										if (item.rank === 1) {
											borderStyle = 'rainbow-border';
											inlineStyle = {};
										} else if (item.rank === 2) {
											borderStyle = 'border-2 border-solid';
											inlineStyle = {
												background:
													'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
												borderColor: '#6b7280',
												boxShadow:
													'0 8px 20px rgba(107, 114, 128, 0.12), 0 0 0 2px rgba(107, 114, 128, 0.2)',
											};
										} else if (item.rank === 3) {
											borderStyle = 'border-2 border-solid';
											inlineStyle = {
												background:
													'linear-gradient(to bottom right, #fed7aa, #fdba74)',
												borderColor: '#ea580c',
												boxShadow:
													'0 8px 20px rgba(234, 88, 12, 0.12), 0 0 0 2px rgba(234, 88, 12, 0.2)',
											};
										}

										if (isCurrentUser) {
											if (isTop) {
												// 상위권일 때는 배경/보더를 덮지 않고 링만 추가
												borderStyle += ' ring-2 ring-[--color-toss-blue]/20';
											} else {
												// 상위권이 아닐 때는 파란 보더로 강조
												borderStyle =
													'bg-white border-2 border-[--color-toss-blue] ring-2 ring-[--color-toss-blue]/20';
											}
										}

										return (
											<div
												key={item.rank}
												className={`flex items-center justify-between p-3 md:p-4 rounded-[--radius-toss] ${borderStyle}`}
												style={inlineStyle}
											>
												<div className="flex items-center gap-3">
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 flex-wrap">
															<p
																className={`font-semibold text-sm md:text-base truncate ${
																	isCurrentUser
																		? 'text-[--color-toss-blue]'
																		: 'text-[--color-toss-gray-900]'
																}`}
															>
																{getRankIcon(item.rank)} {item.nickname}
															</p>
															{item.rank === 1 && (
																<span
																	className="text-xs px-2 py-1 text-white rounded-md flex-shrink-0 font-bold shadow-sm"
																	style={{ backgroundColor: '#F5119E' }}
																>
																	👑 GeometryMaster
																</span>
															)}
														</div>
														<p className="text-xs text-[--color-toss-gray-500] mt-1">
															{
																new Date(item.updatedAt)
																	.toISOString()
																	.split('T')[0]
															}
														</p>
													</div>
												</div>
												<div className="text-right flex-shrink-0">
													<p
														className={`text-lg md:text-xl font-bold ${
															isCurrentUser
																? 'text-[--color-toss-blue]'
																: 'text-[--color-toss-blue]'
														}`}
													>
														{item.score.toFixed(3)} pts
													</p>
												</div>
											</div>
										);
									})}

									{/* 순위권 밖 사용자 정보 */}
									{userInfo && userRank && userRank > 10 && (
										<>
											<div className="flex items-center my-4">
												<div className="flex-1 h-px bg-[--color-toss-gray-300]"></div>
												<span className="px-3 text-sm text-[--color-toss-gray-500]">
													Your Rank
												</span>
												<div className="flex-1 h-px bg-[--color-toss-gray-300]"></div>
											</div>

											<div className="flex items-center justify-between p-3 md:p-4 rounded-[--radius-toss] bg-white border-2 border-[--color-toss-blue] ring-2 ring-[--color-toss-blue]/20">
												<div className="flex items-center gap-3">
													<div className="text-base md:text-lg font-bold min-w-[40px] md:min-w-[50px] flex-shrink-0 text-[--color-toss-blue]">
														#{userInfo.rank}
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 flex-wrap">
															<p className="font-semibold text-sm md:text-base truncate text-[--color-toss-blue]">
																{userInfo.nickname}
															</p>
															{userInfo.rank === 1 && (
																<span
																	className="text-xs px-2 py-1 text-white rounded-full flex-shrink-0 font-bold shadow-sm"
																	style={{ backgroundColor: '#F5119E' }}
																>
																	👑 GeometryMaster
																</span>
															)}
															<span className="text-xs px-2 py-1 bg-[--color-toss-blue] text-white rounded-full flex-shrink-0">
																You
															</span>
														</div>
														<p className="text-xs text-[--color-toss-gray-500] mt-1">
															{
																new Date(userInfo.updatedAt)
																	.toISOString()
																	.split('T')[0]
															}
														</p>
													</div>
												</div>
												<div className="text-right flex-shrink-0">
													<p className="text-lg md:text-xl font-bold text-[--color-toss-blue]">
														{userInfo.score.toFixed(3)} pts
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

			{/* 닉네임 설정 모달 */}
			<NicknameModal
				isOpen={showNicknameModal}
				currentNickname={user?.nickname || ''}
				onSave={handleNicknameSave}
				onCancel={handleNicknameCancel}
			/>
		</div>
	);
}
