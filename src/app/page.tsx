'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SHAPES } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import NicknameModal from '@/components/NicknameModal';

export default function Home() {
	const {
		user,
		isLoading,
		signInWithGoogle,
		signInWithGoogleRedirect,
		signOut,
		updateNickname,
	} = useAuth();
	const [showShapeSelector, setShowShapeSelector] = useState(false);
	const [showNicknameModal, setShowNicknameModal] = useState(false);
	const router = useRouter();

	const shapes = [
		{
			key: SHAPES.CIRCLE,
			name: 'Circle',
			emoji: '⭕',
			difficulty: 'Easy',
			stars: '⭐',
		},
		{
			key: SHAPES.TRIANGLE,
			name: 'Triangle',
			emoji: '🔺',
			difficulty: 'Medium',
			stars: '⭐⭐',
		},
		{
			key: SHAPES.SQUARE,
			name: 'Square',
			emoji: '🟦',
			difficulty: 'Hard',
			stars: '⭐⭐⭐',
		},
		{
			key: SHAPES.STAR5,
			name: 'Star',
			emoji: '⭐',
			difficulty: 'Expert',
			stars: '⭐⭐⭐⭐',
		},
	];

	const handleStartGame = () => {
		setShowShapeSelector(true);
	};

	const handleShapeSelect = (shape: string) => {
		router.push(`/game/${shape}`);
	};

	const handleNicknameSave = async (nickname: string) => {
		try {
			await updateNickname(nickname);
			setShowNicknameModal(false);
		} catch (error) {
			console.error('닉네임 업데이트 실패:', error);
			throw error; // NicknameModal에서 에러 처리
		}
	};

	const handleNicknameCancel = () => {
		setShowNicknameModal(false);
	};

	// 사용자가 로그인했고 닉네임이 필요한 경우 모달 표시
	React.useEffect(() => {
		if (user && user.needsNickname && !showNicknameModal) {
			setShowNicknameModal(true);
		}
	}, [user, showNicknameModal]);

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-[--color-toss-gray-50] flex items-center justify-center">
				<div className="text-center">
					<div className="w-8 h-8 border-4 border-[--color-toss-blue] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-[--color-toss-gray-600]">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen overflow-hidden bg-[--color-toss-gray-50]">
			<Navigation
				user={user}
				onSignIn={signInWithGoogle}
				onSignInRedirect={signInWithGoogleRedirect}
				onSignOut={signOut}
			/>

			<div className="flex items-center justify-center p-4 pt-16 h-full overflow-y-auto">
				<div className="max-w-md w-full">
					<div className="text-center mb-2">
						<p className="text-lg text-[--color-toss-gray-600] font-medium">
							Draw. Score. Master it.
						</p>
					</div>

					<div className="card-toss mb-22">
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
											You can play the game, but{' '}
											<strong>scores won&apos;t be saved</strong> and won&apos;t
											appear in rankings.
										</p>
										<p className="text-red-600 font-medium mt-2">
											Please LOGIN to save your scores.
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
										<p className="text-[--color-toss-gray-800] font-medium">
											Select a shape
										</p>
										<div className="grid grid-cols-2 gap-3">
											{shapes.map((shape) => (
												<button
													key={shape.key}
													onClick={() => handleShapeSelect(shape.key)}
													className="flex flex-col items-center p-4 rounded-[--radius-toss] border-2 border-[--color-toss-gray-200] hover:border-[--color-toss-blue] hover:bg-[--color-toss-blue-light] hover:scale-105 transition-all duration-200 cursor-pointer"
												>
													<span className="text-3xl mb-2">{shape.emoji}</span>
													<span className="text-sm font-medium text-[--color-toss-gray-800] mb-1">
														{shape.name}
													</span>
													<div className="flex flex-col items-center">
														<span className="text-xs text-orange-600 font-medium">
															{shape.difficulty}
														</span>
														<span className="text-xs">{shape.stars}</span>
													</div>
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
										<p className="text-[--color-toss-gray-800] font-medium">
											Select a shape
										</p>
										<div className="grid grid-cols-2 gap-3">
											{shapes.map((shape) => (
												<button
													key={shape.key}
													onClick={() => handleShapeSelect(shape.key)}
													className="flex flex-col items-center p-4 rounded-[--radius-toss] border-2 border-[--color-toss-gray-200] hover:border-[--color-toss-blue] hover:bg-[--color-toss-blue-light] hover:scale-105 transition-all duration-200 cursor-pointer"
												>
													<span className="text-3xl mb-2">{shape.emoji}</span>
													<span className="text-sm font-medium text-[--color-toss-gray-800] mb-1">
														{shape.name}
													</span>
													<div className="flex flex-col items-center">
														<span className="text-xs text-orange-600 font-medium">
															{shape.difficulty}
														</span>
														<span className="text-xs">{shape.stars}</span>
													</div>
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
