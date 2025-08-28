'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SHAPES } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import DrawingCanvas, { type Point } from '@/components/DrawingCanvas';
import Navigation from '@/components/Navigation';
import {
	scoreCircle,
	scoreStar,
	scoreSquare,
	scoreTriangle,
	type ScoringResult,
} from '@/lib/scoring-algorithms';

interface ScoreSubmissionResult {
	isNewRecord: boolean;
	previousBest: number;
}

export default function GamePage() {
	const params = useParams();
	const router = useRouter();
	const shape = params?.shape as string;
	const { user, signInWithGoogle, signInWithGoogleRedirect, signOut } =
		useAuth();
	const [, setDrawingData] = useState<Point[]>([]);
	const [, setHasDrawing] = useState(false);
	const [scoringResult, setScoringResult] = useState<ScoringResult | null>(
		null
	);
	const [isScoring, setIsScoring] = useState(false);
	const [scoreSubmissionResult, setScoreSubmissionResult] =
		useState<ScoreSubmissionResult | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);

	const shapeNames = {
		[SHAPES.CIRCLE]: 'Circle',
		[SHAPES.STAR5]: 'Star',
		[SHAPES.SQUARE]: 'Square',
		[SHAPES.TRIANGLE]: 'Triangle',
	};

	// 드로잉 데이터 핸들러 - 자동 채점 포함
	const handleDrawingComplete = async (path: Point[]) => {
		// 이미 채점 중이거나 결과가 있다면 중복 실행 방지
		if (isScoring || scoringResult) {
			return;
		}

		setDrawingData(path);
		setHasDrawing(path.length > 1);

		// 자동 채점 실행
		if (path.length > 1) {
			await performAutoScore(path);
		}
	};

	// 자동 채점 함수
	const performAutoScore = async (path: Point[]) => {
		setIsScoring(true);

		try {
			// 약간의 지연으로 채점 중 느낌 연출
			await new Promise((resolve) => setTimeout(resolve, 1500));

			let result: ScoringResult;

			// 도형별 채점 알고리즘 호출
			switch (shape) {
				case SHAPES.CIRCLE:
					result = scoreCircle(path);
					break;
				case SHAPES.STAR5:
					result = scoreStar(path);
					break;
				case SHAPES.SQUARE:
					result = scoreSquare(path);
					break;
				case SHAPES.TRIANGLE:
					result = scoreTriangle(path);
					break;
				default:
					result = {
						score: 0,
						feedback: 'Unknown shape.',
						details: { accuracy: 0, smoothness: 0, completeness: 0 },
					};
			}

			setScoringResult(result);

			// 로그인된 사용자의 경우 점수를 서버에 저장
			if (user) {
				try {
					const response = await fetch('/api/scores/submit', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							userId: user.id,
							shape,
							score: result.score,
						}),
					});

					if (response.ok) {
						const data = await response.json();
						setScoreSubmissionResult({
							isNewRecord: data.isNewRecord,
							previousBest: data.previousBest,
						});
					} else {
						const errorData = await response.json();
						console.error('Score submission failed:', errorData);
					}
				} catch (error) {
					console.error('Failed to save score:', error);
				}
			}
		} catch (error) {
			console.error('Auto scoring error:', error);
		} finally {
			setIsScoring(false);
		}
	};

	const handleDrawingChange = (path: Point[]) => {
		setHasDrawing(path.length > 1);
	};

	// 공유하기 기능
	const handleShare = async () => {
		if (!scoringResult) return;

		const shareText = `I got ${scoringResult.score} points. Can you do it too? https://geometrymaster.xyz/`;

		try {
			await navigator.clipboard.writeText(shareText);
			setCopySuccess(true);
			// 2초 후 성공 메시지 제거
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			// 폴백: 텍스트 선택 방식
			const textArea = document.createElement('textarea');
			textArea.value = shareText;
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand('copy');
				setCopySuccess(true);
				setTimeout(() => setCopySuccess(false), 2000);
			} catch (fallbackError) {
				console.error('Fallback copy failed:', fallbackError);
			}
			document.body.removeChild(textArea);
		}
	};

	if (
		!shape ||
		!Object.values(SHAPES).includes(
			shape as (typeof SHAPES)[keyof typeof SHAPES]
		)
	) {
		return (
			<div className="min-h-screen bg-[--color-toss-gray-50] flex items-center justify-center p-4">
				<div className="card-toss text-center">
					<h2 className="text-xl font-bold text-[--color-toss-gray-900] mb-4">
						Invalid Access
					</h2>
					<button onClick={() => router.push('/')} className="btn-primary">
						Back to Home
					</button>
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

			<div
				className="h-screen bg-white relative overflow-hidden"
				style={{ touchAction: 'none' }}
			>
				{/* Top header - minimized UI */}
				<div className="absolute top-0 left-0 right-0 z-20 p-4">
					<div className="flex items-center justify-between">
						{/* <button onClick={() => router.push('/')} className="btn-secondary">
						←
					</button> */}
						<div className="text-center bg-white/90 backdrop-blur-sm rounded-[--radius-toss-lg] px-6 py-3">
							<div className="text-lg font-bold text-[--color-toss-gray-800]">
								Draw a {shapeNames[shape as keyof typeof shapeNames]}
							</div>
						</div>
						<div></div> {/* 균형을 위한 빈 공간 */}
					</div>
				</div>

				{/* Full screen canvas */}
				<DrawingCanvas
					fullScreen={true}
					onDrawingComplete={handleDrawingComplete}
					onDrawingChange={handleDrawingChange}
					strokeWidth={4}
					strokeColor="var(--color-toss-blue)"
					backgroundColor="white"
				/>

				{/* Scoring loading modal */}
				{isScoring && (
					<div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
						<div className="bg-white rounded-[--radius-toss-xl] p-8 max-w-sm w-full mx-4 shadow-2xl">
							<div className="text-center">
								<div className="animate-spin w-12 h-12 border-4 border-[--color-toss-blue] border-t-transparent rounded-full mx-auto mb-6"></div>
								<h3 className="text-xl font-bold text-[--color-toss-gray-800] mb-2">
									Scoring...
								</h3>
								<p className="text-[--color-toss-gray-600]">
									Analyzing the accuracy of your{' '}
									{shapeNames[shape as keyof typeof shapeNames]}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Scoring result modal - card form in center of screen */}
				{scoringResult && !isScoring && (
					<div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
						<div className="bg-white rounded-[--radius-toss-xl] p-8 max-w-md w-full mx-4 shadow-2xl">
							<div className="text-center">
								<div className="mb-6">
									{user && scoreSubmissionResult?.isNewRecord && (
										<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[--radius-toss] text-green-700">
											<p className="text-sm font-bold">🎉 New Record!</p>
											<p className="text-xs">
												Previous Best: {scoreSubmissionResult.previousBest} pts
											</p>
										</div>
									)}
									<div className="text-6xl font-bold text-[--color-toss-blue] mb-3">
										{scoringResult.score} pts
									</div>
									<p className="text-xl font-medium text-[--color-toss-gray-800] mb-4">
										{scoringResult.feedback}
									</p>
									{user &&
										scoreSubmissionResult &&
										!scoreSubmissionResult.isNewRecord && (
											<p className="text-sm text-[--color-toss-gray-600] mb-2">
												Best Score: {scoreSubmissionResult.previousBest} pts
											</p>
										)}
								</div>

								{/* Detailed scores */}
								<div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-[--color-toss-gray-50] rounded-[--radius-toss]">
									<div className="text-center">
										<div className="text-2xl font-bold text-[--color-toss-blue] mb-1">
											{scoringResult.details.accuracy}%
										</div>
										<p className="text-xs text-[--color-toss-gray-600] font-medium">
											Accuracy
										</p>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-[--color-toss-blue] mb-1">
											{scoringResult.details.smoothness}%
										</div>
										<p className="text-xs text-[--color-toss-gray-600] font-medium">
											Smoothness
										</p>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-[--color-toss-blue] mb-1">
											{scoringResult.details.completeness}%
										</div>
										<p className="text-xs text-[--color-toss-gray-600] font-medium">
											Completeness
										</p>
									</div>
								</div>

								{/* Login status notice */}
								{!user && (
									<div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-[--radius-toss] text-amber-700">
										<p className="text-sm font-medium">
											⚠️ Scores will not be saved in guest mode
										</p>
									</div>
								)}

								{/* Copy success message */}
								{copySuccess && (
									<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[--radius-toss] text-green-700">
										<p className="text-sm font-medium">
											✅ Copied to clipboard!
										</p>
									</div>
								)}

								{/* Action buttons */}
								<div className="space-y-3">
									<button
										onClick={handleShare}
										className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
									>
										<svg
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<circle cx="18" cy="5" r="3" />
											<circle cx="6" cy="12" r="3" />
											<circle cx="18" cy="19" r="3" />
											<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
											<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
										</svg>
										Share Score
									</button>
									<div className="flex gap-3">
										<button
											onClick={() => {
												setScoringResult(null);
												window.location.reload();
											}}
											className="btn-secondary flex-1 py-3"
										>
											Try Again
										</button>
										<button
											onClick={() => router.push('/ranking')}
											className="btn-secondary flex-1 py-3"
										>
											View Rankings
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
