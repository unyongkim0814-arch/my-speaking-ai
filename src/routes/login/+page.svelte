<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { signIn, user } from '$lib/stores/authStore';
	
	let email = '';
	let password = '';
	let error = '';
	let loading = false;
	
	// 비밀번호 표시/숨김 상태
	let showPassword = false;
	
	// 이미 로그인된 경우 메인 페이지로 리다이렉트
	onMount(() => {
		const unsubscribe = user.subscribe(($user) => {
			if ($user) {
				goto('/');
			}
		});
		
		return unsubscribe;
	});
	
	async function handleSubmit() {
		if (!email || !password) {
			error = '이메일과 비밀번호를 입력해주세요.';
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			await signIn(email, password);
			goto('/');
		} catch (e) {
			error = e.message || '로그인에 실패했습니다.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<h1>로그인</h1>
		
		{#if error}
			<div class="error-message">
				{error}
			</div>
		{/if}
		
		<form on:submit|preventDefault={handleSubmit}>
			<div class="form-group">
				<label for="email">이메일</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="your@email.com"
					required
					disabled={loading}
				/>
			</div>
			
			<div class="form-group">
				<label for="password">비밀번호</label>
				<div class="input-with-icon">
					<input
						id="password"
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="비밀번호를 입력하세요"
						required
						disabled={loading}
					/>
					<button 
						type="button"
						class="toggle-password"
						on:click={() => showPassword = !showPassword}
						aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
					>
						{#if showPassword}
							<!-- 눈 감긴 아이콘 -->
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
								<line x1="1" y1="1" x2="23" y2="23"></line>
							</svg>
						{:else}
							<!-- 눈 뜬 아이콘 -->
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
								<circle cx="12" cy="12" r="3"></circle>
							</svg>
						{/if}
					</button>
				</div>
			</div>
			
			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? '로그인 중...' : '로그인'}
			</button>
		</form>
		
		<div class="auth-footer">
			<p>계정이 없으신가요? <a href="/signup">회원가입</a></p>
		</div>
	</div>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 2rem;
	}
	
	.auth-card {
		background: white;
		border-radius: 20px;
		padding: 3rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		max-width: 450px;
		width: 100%;
	}
	
	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 2rem;
		font-size: 2rem;
	}
	
	.error-message {
		background: #fee;
		color: #c33;
		padding: 1rem;
		border-radius: 10px;
		margin-bottom: 1.5rem;
		text-align: center;
		border: 1px solid #fcc;
	}
	
	.form-group {
		margin-bottom: 1.5rem;
	}
	
	label {
		display: block;
		margin-bottom: 0.5rem;
		color: #555;
		font-weight: 600;
		font-size: 0.95rem;
	}
	
	.input-with-icon {
		position: relative;
		display: flex;
		align-items: center;
	}
	
	input {
		width: 100%;
		padding: 0.875rem;
		padding-right: 3rem;
		border: 2px solid #e0e0e0;
		border-radius: 10px;
		font-size: 1rem;
		transition: all 0.3s ease;
		box-sizing: border-box;
	}
	
	input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}
	
	input:disabled {
		background: #f5f5f5;
		cursor: not-allowed;
	}
	
	.toggle-password {
		position: absolute;
		right: 0.75rem;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
		transition: all 0.3s ease;
		border-radius: 6px;
	}
	
	.toggle-password:hover {
		color: #667eea;
		background: rgba(102, 126, 234, 0.1);
	}
	
	.toggle-password:active {
		background: rgba(102, 126, 234, 0.2);
		transform: scale(0.95);
	}
	
	.toggle-password:focus {
		outline: 2px solid #667eea;
		outline-offset: 2px;
		border-radius: 6px;
	}
	
	.btn-primary {
		width: 100%;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 10px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		margin-top: 1rem;
	}
	
	.btn-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
	}
	
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}
	
	.auth-footer {
		text-align: center;
		margin-top: 2rem;
		color: #666;
	}
	
	.auth-footer a {
		color: #667eea;
		text-decoration: none;
		font-weight: 600;
	}
	
	.auth-footer a:hover {
		text-decoration: underline;
	}
	
	@media (max-width: 640px) {
		.auth-card {
			padding: 2rem;
		}
		
		h1 {
			font-size: 1.5rem;
		}
	}
</style>
