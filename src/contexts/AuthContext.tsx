'use client';

import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from 'react';

export interface User {
	id: string;
	google_uid: string;
	nickname: string;
	email?: string;
}

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	signInWithGoogle: () => Promise<void>;
	signInWithGoogleRedirect: () => void;
	signOut: () => void;
	updateNickname: (nickname: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// 페이지 로드 시 로컬 스토리지에서 사용자 정보 복원
		const savedUser = localStorage.getItem('geometrymaster_user');
		if (savedUser) {
			try {
				const parsedUser = JSON.parse(savedUser);
				setUser(parsedUser);
			} catch (error) {
				console.error('Failed to parse saved user:', error);
				localStorage.removeItem('geometrymaster_user');
			}
		}
		setIsLoading(false);

		// 리디렉션 로그인을 위한 메시지 리스너 추가
		const handleMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;

			if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.user) {
				setUser(event.data.user);
				localStorage.setItem(
					'geometrymaster_user',
					JSON.stringify(event.data.user)
				);
			}
		};

		window.addEventListener('message', handleMessage);

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	const signInWithGoogle = async () => {
		try {
			setIsLoading(true);

			if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
				throw new Error('Google Client ID not found');
			}

			// Google OAuth 플로우 시작
			const redirectUri = `${window.location.origin}/auth/callback`;
			const googleAuthUrl =
				`https://accounts.google.com/o/oauth2/v2/auth?` +
				`client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&` +
				`redirect_uri=${encodeURIComponent(redirectUri)}&` +
				`response_type=code&` +
				`scope=openid profile email&` +
				`access_type=offline&` +
				`prompt=select_account`;

			// 팝업으로 Google 인증 페이지 열기
			const popup = window.open(
				googleAuthUrl,
				'google-signin',
				'width=500,height=600,scrollbars=yes,resizable=yes'
			);

			if (!popup) {
				throw new Error('Popup was blocked. Please allow popups.');
			}

			// 팝업에서 메시지 받기
			const handleMessage = async (event: MessageEvent) => {
				if (event.origin !== window.location.origin) return;

				if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
					const { code } = event.data;
					popup?.close();

					try {
						// 인증 코드를 백엔드로 전송
						const response = await fetch('/api/auth/google', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ code }),
						});

						if (!response.ok) {
							throw new Error('Authentication failed');
						}

						const { user: newUser } = await response.json();

						setUser(newUser);
						localStorage.setItem(
							'geometrymaster_user',
							JSON.stringify(newUser)
						);
					} catch (error) {
						console.error('Authentication error:', error);
						alert('Login failed. Please try again.');
					}

					window.removeEventListener('message', handleMessage);
				} else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
					popup?.close();
					console.error('Google auth error:', event.data.error);
					alert('Google authentication failed.');
					window.removeEventListener('message', handleMessage);
				}
			};

			window.addEventListener('message', handleMessage);

			// 팝업이 닫혔는지 체크
			const checkClosed = setInterval(() => {
				if (popup?.closed) {
					clearInterval(checkClosed);
					window.removeEventListener('message', handleMessage);
					setIsLoading(false);
				}
			}, 1000);
		} catch (error) {
			console.error('Sign in error:', error);
			alert('An error occurred during login.');
			setIsLoading(false);
		}
	};

	const signInWithGoogleRedirect = () => {
		if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
			alert('Google Client ID not configured');
			return;
		}

		const redirectUri = `${window.location.origin}/auth/callback`;
		const googleAuthUrl =
			`https://accounts.google.com/o/oauth2/v2/auth?` +
			`client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&` +
			`redirect_uri=${encodeURIComponent(redirectUri)}&` +
			`response_type=code&` +
			`scope=openid profile email&` +
			`access_type=offline&` +
			`prompt=select_account`;

		window.location.href = googleAuthUrl;
	};

	const signOut = () => {
		setUser(null);
		localStorage.removeItem('geometrymaster_user');
	};

	const updateNickname = async (nickname: string) => {
		if (!user) return;

		try {
			const response = await fetch('/api/user/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: user.id,
					nickname,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to update nickname');
			}

			const updatedUser = {
				...user,
				nickname,
			};

			setUser(updatedUser);
			localStorage.setItem('geometrymaster_user', JSON.stringify(updatedUser));
		} catch (error) {
			console.error('Update nickname error:', error);
			throw error;
		}
	};

	const value = {
		user,
		isLoading,
		signInWithGoogle,
		signInWithGoogleRedirect,
		signOut,
		updateNickname,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
