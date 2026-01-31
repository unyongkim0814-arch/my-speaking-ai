import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClientBrowser';

// 사용자 인증 상태 store
export const user = writable(null);
export const loading = writable(true);

// 인증 상태 초기화
export async function initAuth() {
	loading.set(true);
	
	// 현재 세션 가져오기
	const { data: { session } } = await supabase.auth.getSession();
	user.set(session?.user ?? null);
	
	// 인증 상태 변경 감지
	supabase.auth.onAuthStateChange((event, session) => {
		user.set(session?.user ?? null);
	});
	
	loading.set(false);
}

// URL 가져오기 함수
function getURL() {
	let url =
		process?.env?.NEXT_PUBLIC_SITE_URL ?? // 프로덕션 환경
		process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Vercel 자동 설정
		typeof window !== 'undefined' ? window.location.origin : // 브라우저
		'http://localhost:5173/'; // 기본값
	
	// https:// 확인
	url = url.startsWith('http') ? url : `https://${url}`;
	// 마지막 슬래시 확인
	url = url.endsWith('/') ? url : `${url}/`;
	return url;
}

// 회원가입
export async function signUp(email, password) {
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			emailRedirectTo: `${getURL()}auth/callback`
		}
	});
	
	if (error) throw error;
	return data;
}

// 로그인
export async function signIn(email, password) {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});
	
	if (error) throw error;
	return data;
}

// 로그아웃
export async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
	user.set(null);
}
