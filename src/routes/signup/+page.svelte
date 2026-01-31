<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { signUp, user } from '$lib/stores/authStore';
	
	let email = '';
	let password = '';
	let confirmPassword = '';
	let error = '';
	let loading = false;
	let success = false;
	
	// 비밀번호 표시/숨김 상태
	let showPassword = false;
	let showConfirmPassword = false;
	
	// 비밀번호 일치 여부 상태 (실시간 반응)
	$: passwordLengthValid = password.length >= 6;
	$: hasConfirmPassword = confirmPassword.length > 0;
	$: passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
	$: passwordsDontMatch = confirmPassword.length > 0 && password !== confirmPassword;
	
	// 이미 로그인된 경우 메인 페이지로 리다이렉트
	onMount(() => {
		const unsubscribe = user.subscribe(($user) => {
			if ($user && !success) {
				goto('/');
			}
		});
		
		return unsubscribe;
	});
	
	async function handleSubmit() {
		// 유효성 검사
		if (!email || !password || !confirmPassword) {
			error = '모든 필드를 입력해주세요.';
			return;
		}
		
		if (password !== confirmPassword) {
			error = '비밀번호가 일치하지 않습니다.';
			return;
		}
		
		if (password.length < 6) {
			error = '비밀번호는 최소 6자 이상이어야 합니다.';
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			await signUp(email, password);
			success = true;
			
			// 3초 후 로그인 페이지로 이동
			setTimeout(() => {
				goto('/login');
			}, 3000);
		} catch (e) {
			error = e.message || '회원가입에 실패했습니다.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<h1>회원가입</h1>
		
		{#if success}
			<div class="success-message">
				<div class="success-icon">✅</div>
				<h2>회원가입이 완료되었습니다!</h2>
				<p>
					<strong>{email}</strong> 주소로<br/>
					인증 이메일을 발송했습니다.
				</p>
				<div class="instruction-box">
					<p class="instruction-title">📧 다음 단계:</p>
					<ol class="instruction-list">
						<li>이메일 받은편지함을 확인하세요</li>
						<li>인증 링크를 클릭하세요</li>
						<li>자동으로 로그인됩니다</li>
					</ol>
				</div>
				<p class="note">💡 이메일이 보이지 않으면 스팸함을 확인해주세요.</p>
				<p class="redirect-note">잠시 후 로그인 페이지로 이동합니다...</p>
			</div>
		{:else}
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
							placeholder="최소 6자 이상"
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
					{#if password && !passwordLengthValid}
						<div class="validation-message warning">
							⚠️ 비밀번호는 최소 6자 이상이어야 합니다
						</div>
					{:else if password && passwordLengthValid}
						<div class="validation-message success">
							✓ 사용 가능한 비밀번호입니다
						</div>
					{/if}
				</div>
				
				<div class="form-group">
					<label for="confirmPassword">비밀번호 확인</label>
					<div class="input-with-icon">
						<input
							id="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="비밀번호를 다시 입력하세요"
							required
							disabled={loading}
						/>
						<button 
							type="button"
							class="toggle-password"
							on:click={() => showConfirmPassword = !showConfirmPassword}
							aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
						>
							{#if showConfirmPassword}
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
					{#if passwordsMatch}
						<div class="validation-message success">
							✓ 비밀번호가 일치합니다
						</div>
					{:else if passwordsDontMatch}
						<div class="validation-message error">
							✗ 비밀번호가 일치하지 않습니다
						</div>
					{/if}
				</div>
				
				<button type="submit" class="btn-primary" disabled={loading}>
					{loading ? '가입 중...' : '회원가입'}
				</button>
			</form>
			
			<div class="auth-footer">
				<p>이미 계정이 있으신가요? <a href="/login">로그인</a></p>
			</div>
		{/if}
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
	
	.success-message {
		background: #d4edda;
		color: #155724;
		padding: 2rem;
		border-radius: 10px;
		text-align: center;
		border: 1px solid #c3e6cb;
		line-height: 1.6;
	}
	
	.success-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}
	
	.success-message h2 {
		color: #155724;
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
	}
	
	.success-message p {
		margin: 0.75rem 0;
	}
	
	.instruction-box {
		background: white;
		padding: 1.25rem;
		border-radius: 8px;
		margin: 1.5rem 0;
		border: 1px solid #c3e6cb;
	}
	
	.instruction-title {
		font-weight: 700;
		font-size: 1rem;
		margin-bottom: 0.75rem;
		color: #155724;
	}
	
	.instruction-list {
		text-align: left;
		padding-left: 1.5rem;
		margin: 0;
		color: #155724;
	}
	
	.instruction-list li {
		margin: 0.5rem 0;
	}
	
	.note {
		font-size: 0.9rem;
		color: #0c5460;
		background: #d1ecf1;
		padding: 0.75rem;
		border-radius: 6px;
		margin: 1rem 0;
		border: 1px solid #bee5eb;
	}
	
	.redirect-note {
		font-size: 0.85rem;
		color: #856404;
		margin-top: 1rem;
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
	
	.validation-message {
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		animation: slideDown 0.3s ease;
	}
	
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.validation-message.success {
		background: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}
	
	.validation-message.error {
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}
	
	.validation-message.warning {
		background: #fff3cd;
		color: #856404;
		border: 1px solid #ffeaa7;
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
