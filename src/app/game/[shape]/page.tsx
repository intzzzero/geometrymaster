'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SHAPES } from '@/lib/supabase-client';
import DrawingCanvas, { type Point } from '@/components/DrawingCanvas';
import Navigation from '@/components/Navigation';
import {
	scoreCircle,
	scoreStar,
	scoreSquare,
	scoreTriangle,
	type ScoringResult,
} from '@/lib/scoring-algorithms';

// Temporary mock authentication (will be implemented later)
const mockUser = { id: '1', nickname: 'TestUser', needsNickname: false };

export default function GamePage() {
	const params = useParams();
	const router = useRouter();
	const shape = params?.shape as string;
	const [user, setUser] = useState<typeof mockUser | null>(mockUser); // Temporary mock
	const [, setDrawingData] = useState<Point[]>([]);
	const [, setHasDrawing] = useState(false);
	const [scoringResult, setScoringResult] = useState<ScoringResult | null>(
		null
	);
	const [isScoring, setIsScoring] = useState(false);

	// Authentication handlers
	const signInWithGoogle = () => {
		// Temporary - will implement actual Google OAuth later
		setUser(mockUser);
	};

	const signOut = () => {
		setUser(null);
	};

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

			// TODO: 로그인된 사용자의 경우 점수를 서버에 저장
			if (user) {
				console.log('TODO: Save score to server', result.score);
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
		<div className="min-h-screen bg-[--color-toss-gray-50]">
			<Navigation user={user} onSignIn={signInWithGoogle} onSignOut={signOut} />
			
			<div className="min-h-screen bg-white relative">
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
								Analyzing the accuracy of your {shapeNames[shape as keyof typeof shapeNames]}
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
								<div className="text-6xl font-bold text-[--color-toss-blue] mb-3">
									{scoringResult.score} pts
								</div>
								<p className="text-xl font-medium text-[--color-toss-gray-800] mb-4">
									{scoringResult.feedback}
								</p>
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

							{/* Action buttons */}
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
			)}
			</div>
		</div>
	);
}
