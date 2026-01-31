<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClientBrowser';
	
	let loading = true;
	let error = null;
	
	onMount(async () => {
		try {
			// URL에서 토큰 가져오기
			const params = new URLSearchParams(window.location.hash.substring(1));
			const token_hash = params.get('token_hash');
			const type = params.get('type');
			const error_code = params.get('error_code');
			const error_description = params.get('error_description');
			
			// 에러가 있는 경우
			if (error_code) {
				error = error_description || '인증 중 오류가 발생했습니다.';
				loading = false;
				
				// 3초 후 로그인 페이지로 이동
				setTimeout(() => {
					goto('/login');
				}, 3000);
				return;
			}
			
			// 토큰이 있는 경우 인증 확인
			if (token_hash && type) {
				const { error: verifyError } = await supabase.auth.verifyOtp({
					token_hash,
					type: type
				});
				
				if (verifyError) {
					error = '이메일 인증에 실패했습니다.';
					loading = false;
					
					// 3초 후 로그인 페이지로 이동
					setTimeout(() => {
						goto('/login');
					}, 3000);
					return;
				}
			}
			
			// 세션 확인
			const { data: { session } } = await supabase.auth.getSession();
			
			if (session) {
				// 인증 성공 - 메인 페이지로 이동
				goto('/');
			} else {
				// 세션이 없으면 로그인 페이지로
				goto('/login');
			}
		} catch (e) {
			console.error('인증 오류:', e);
			error = '인증 처리 중 오류가 발생했습니다.';
			loading = false;
			
			setTimeout(() => {
				goto('/login');
			}, 3000);
		}
	});
</script>

<div class="callback-container">
	<div class="callback-card">
		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<h2>이메일 인증 중...</h2>
				<p>잠시만 기다려주세요.</p>
			</div>
		{:else if error}
			<div class="error">
				<div class="error-icon">⚠️</div>
				<h2>인증 오류</h2>
				<p>{error}</p>
				<p class="redirect-message">잠시 후 로그인 페이지로 이동합니다...</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.callback-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 2rem;
	}
	
	.callback-card {
		background: white;
		border-radius: 20px;
		padding: 3rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		max-width: 450px;
		width: 100%;
		text-align: center;
	}
	
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}
	
	.spinner {
		width: 50px;
		height: 50px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #667eea;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	h2 {
		color: #333;
		margin: 0;
		font-size: 1.5rem;
	}
	
	p {
		color: #666;
		margin: 0;
		font-size: 1rem;
	}
	
	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	.error-icon {
		font-size: 3rem;
	}
	
	.error h2 {
		color: #c33;
	}
	
	.redirect-message {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: #999;
	}
</style>
