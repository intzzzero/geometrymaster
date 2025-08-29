'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SHAPES } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import NicknameModal from '@/components/NicknameModal';

interface HallOfFameItem {
	id: string;
	shape: string;
	championScore: number;
	rankingYear: number;
	rankingMonth: number;
	monthDisplay: string;
	championNickname: string;
	achievedAt: string;
}

interface YearStats {
	year: number;
	totalMonths: number;
	uniqueShapes: number;
	highestScore: number;
	averageScore: number;
}

interface HallOfFameResponse {
	hallOfFame: HallOfFameItem[];
	yearStats: YearStats[];
	totalRecords: number;
	currentMonth: {
		year: number;
		month: number;
	};
}

export default function HallOfFamePage() {
	const [selectedShape, setSelectedShape] = useState<string>('');
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
	const [hallOfFame, setHallOfFame] = useState<HallOfFameItem[]>([]);
	const [yearStats, setYearStats] = useState<YearStats[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showNicknameModal, setShowNicknameModal] = useState(false);
	
	const { user, signInWithGoogle, signInWithGoogleRedirect, signOut, updateNickname } = useAuth();
	const router = useRouter();

	const shapes = [
		{ key: '', label: 'All Shapes' },
		{ key: SHAPES.CIRCLE, label: 'Circle' },
		{ key: SHAPES.TRIANGLE, label: 'Triangle' },
		{ key: SHAPES.SQUARE, label: 'Square' },
		{ key: SHAPES.STAR5, label: 'Star' },
	];

	// Get last month as default
	const getLastMonth = () => {
		const now = new Date();
		const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
		const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
		return { year: lastYear, month: lastMonth };
	};

	// Initialize with last month
	useEffect(() => {
		const { year, month } = getLastMonth();
		setSelectedYear(year);
		setSelectedMonth(month);
	}, []);

	// Generate year options (last 3 years)
	const getYearOptions = () => {
		const currentYear = new Date().getFullYear();
		const years = [];
		for (let i = 0; i < 3; i++) {
			years.push(currentYear - i);
		}
		return years;
	};

	// Generate month options
	const getMonthOptions = () => {
		return [
			{ value: 1, label: 'January' },
			{ value: 2, label: 'February' },
			{ value: 3, label: 'March' },
			{ value: 4, label: 'April' },
			{ value: 5, label: 'May' },
			{ value: 6, label: 'June' },
			{ value: 7, label: 'July' },
			{ value: 8, label: 'August' },
			{ value: 9, label: 'September' },
			{ value: 10, label: 'October' },
			{ value: 11, label: 'November' },
			{ value: 12, label: 'December' },
		];
	};

	// Hall of Fame 페이지에서는 스크롤 허용
	useEffect(() => {
		document.body.classList.add('allow-scroll');
		return () => {
			document.body.classList.remove('allow-scroll');
		};
	}, []);

	useEffect(() => {
		if (selectedYear === null || selectedMonth === null) return;

		const fetchHallOfFame = async () => {
			setLoading(true);
			setError(null);

			try {
				const url = new URL('/api/hall-of-fame', window.location.origin);
				if (selectedShape) {
					url.searchParams.set('shape', selectedShape);
				}
				url.searchParams.set('year', selectedYear.toString());

				const response = await fetch(url.toString());

				if (!response.ok) {
					throw new Error('Failed to fetch hall of fame');
				}

				const data: HallOfFameResponse = await response.json();
				
				// Filter by selected month
				const filteredData = data.hallOfFame.filter(
					item => item.rankingMonth === selectedMonth
				);
				
				setHallOfFame(filteredData || []);
				setYearStats(data.yearStats || []);
			} catch (err) {
				console.error('Failed to fetch hall of fame:', err);
				setError('Failed to load hall of fame');
				setHallOfFame([]);
				setYearStats([]);
			} finally {
				setLoading(false);
			}
		};

		fetchHallOfFame();
	}, [selectedShape, selectedYear, selectedMonth]);

	const getShapeIcon = (shape: string) => {
		switch (shape) {
			case SHAPES.CIRCLE:
				return (
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
					</svg>
				);
			case SHAPES.TRIANGLE:
				return (
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M12 3l9 18H3l9-18z" stroke="currentColor" strokeWidth="2" fill="none" />
					</svg>
				);
			case SHAPES.SQUARE:
				return (
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" />
					</svg>
				);
			case SHAPES.STAR5:
				return (
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" fill="none" />
					</svg>
				);
			default:
				return null;
		}
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
				<div className="max-w-4xl w-full">
					<div className="text-center mb-6">
						<h1 className="text-2xl md:text-3xl font-bold text-[--color-toss-gray-900] mb-2">
							Hall of Fame
						</h1>
						<p className="text-base md:text-lg text-[--color-toss-gray-600] font-medium">
							Monthly champions and their legendary records
						</p>
					</div>

					{/* Filters */}
					<div className="card-toss mb-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							{/* Shape Filter */}
							<div>
								<label className="block text-sm font-medium text-[--color-toss-gray-800] mb-2">
									Shape
								</label>
								<select
									value={selectedShape}
									onChange={(e) => setSelectedShape(e.target.value)}
									className="w-full p-3 rounded-[--radius-toss] border border-[--color-toss-gray-300] bg-white text-[--color-toss-gray-900] focus:outline-none focus:ring-2 focus:ring-[--color-toss-blue] focus:border-[--color-toss-blue] transition-colors"
								>
									{shapes.map((shape) => (
										<option key={shape.key} value={shape.key}>
											{shape.label}
										</option>
									))}
								</select>
							</div>

							{/* Year Filter */}
							<div>
								<label className="block text-sm font-medium text-[--color-toss-gray-800] mb-2">
									Year
								</label>
								<select
									value={selectedYear || ''}
									onChange={(e) => setSelectedYear(parseInt(e.target.value))}
									className="w-full p-3 rounded-[--radius-toss] border border-[--color-toss-gray-300] bg-white text-[--color-toss-gray-900] focus:outline-none focus:ring-2 focus:ring-[--color-toss-blue] focus:border-[--color-toss-blue] transition-colors"
								>
									{getYearOptions().map((year) => (
										<option key={year} value={year}>
											{year}
										</option>
									))}
								</select>
							</div>

							{/* Month Filter */}
							<div>
								<label className="block text-sm font-medium text-[--color-toss-gray-800] mb-2">
									Month
								</label>
								<select
									value={selectedMonth || ''}
									onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
									className="w-full p-3 rounded-[--radius-toss] border border-[--color-toss-gray-300] bg-white text-[--color-toss-gray-900] focus:outline-none focus:ring-2 focus:ring-[--color-toss-blue] focus:border-[--color-toss-blue] transition-colors"
								>
									{getMonthOptions().map((month) => (
										<option key={month.value} value={month.value}>
											{month.label}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="bg-[--color-toss-gray-50] rounded-[--radius-toss-lg]">
							{loading ? (
								<div className="text-center py-12">
									<div className="animate-spin w-8 h-8 border-2 border-[--color-toss-blue] border-t-transparent rounded-full mx-auto mb-4"></div>
									<p className="text-[--color-toss-gray-600]">Loading hall of fame...</p>
								</div>
							) : error ? (
								<div className="text-center py-12">
									<p className="text-red-600 mb-2">⚠️ {error}</p>
									<button
										onClick={() => window.location.reload()}
										className="btn-secondary text-sm"
									>
										Retry
									</button>
								</div>
							) : hallOfFame.length === 0 ? (
								<div className="text-center py-12">
									<p className="text-[--color-toss-gray-600]">No champions found for the selected period</p>
									<p className="text-sm text-[--color-toss-gray-500] mt-2">
										Try selecting a different time period
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{hallOfFame.map((champion, index) => (
										<div
											key={champion.id}
											className="flex items-center justify-between p-4 bg-white rounded-[--radius-toss] border border-[--color-toss-gray-200] shadow-sm hover:shadow-md transition-shadow"
										>
											<div className="flex items-center gap-4">
												{/* Shape Icon */}
												<div className="flex items-center justify-center w-12 h-12 rounded-[--radius-toss] bg-[--color-toss-gray-100] text-[--color-toss-gray-700]">
													{getShapeIcon(champion.shape)}
												</div>
												
												{/* Champion Info */}
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-3 flex-wrap">
														<h3 className="font-semibold text-lg text-[--color-toss-gray-900] truncate">
															{champion.championNickname}
														</h3>
														<span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold rounded-full shadow-sm">
															👑 Monthly Champion
														</span>
													</div>
													<p className="text-sm text-[--color-toss-gray-600] mt-1">
														{champion.monthDisplay} • {new Date(champion.achievedAt).toLocaleDateString()}
													</p>
												</div>
											</div>
											
											{/* Score */}
											<div className="text-right flex-shrink-0">
												<p className="text-2xl font-bold text-[--color-toss-blue]">
													{champion.championScore.toFixed(3)}
												</p>
												<p className="text-sm text-[--color-toss-gray-500]">pts</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Year Stats */}
						{yearStats.length > 0 && (
							<div className="mt-8 pt-6 border-t border-[--color-toss-gray-200]">
								<h2 className="text-lg font-semibold text-[--color-toss-gray-900] mb-4">
									Year Statistics
								</h2>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									{yearStats.map((stat) => (
										<div key={stat.year} className="text-center p-4 bg-white rounded-[--radius-toss] border border-[--color-toss-gray-200]">
											<p className="text-xl font-bold text-[--color-toss-blue]">{stat.year}</p>
											<p className="text-sm text-[--color-toss-gray-600]">{stat.totalMonths} months</p>
											<p className="text-sm text-[--color-toss-gray-600]">High: {stat.highestScore.toFixed(3)}</p>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="mt-6 text-center">
							<button
								onClick={() => router.push('/')}
								className="btn-secondary px-8 py-3 mr-4"
							>
								Back to Home
							</button>
							<button
								onClick={() => router.push('/ranking')}
								className="btn-primary px-8 py-3"
							>
								View Current Rankings
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