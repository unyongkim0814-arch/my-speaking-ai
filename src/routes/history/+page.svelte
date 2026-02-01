<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/authStore';
	import { getConversations, deleteConversation } from '$lib/conversationStore';

	let conversations = [];
	let loading = true;
	let error = null;
	let selectedConversation = null;

	onMount(async () => {
		// 로그인 확인
		const unsubscribe = user.subscribe(async ($user) => {
			if ($user === null && typeof window !== 'undefined') {
				goto('/login');
			} else if ($user) {
				await loadConversations($user.id);
			}
		});

		return unsubscribe;
	});

	async function loadConversations(userId) {
		try {
			loading = true;
			error = null;
			conversations = await getConversations(userId);
		} catch (err) {
			console.error('대화 기록 로드 실패:', err);
			error = '대화 기록을 불러오는데 실패했습니다.';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(conversationId) {
		if (!confirm('이 대화 기록을 삭제하시겠습니까?')) {
			return;
		}

		try {
			await deleteConversation(conversationId);
			conversations = conversations.filter(c => c.id !== conversationId);
			if (selectedConversation?.id === conversationId) {
				selectedConversation = null;
			}
			alert('대화 기록이 삭제되었습니다.');
		} catch (err) {
			console.error('삭제 실패:', err);
			alert('대화 기록 삭제에 실패했습니다.');
		}
	}

	function formatDate(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return '방금 전';
		if (diffMins < 60) return `${diffMins}분 전`;
		if (diffHours < 24) return `${diffHours}시간 전`;
		if (diffDays < 7) return `${diffDays}일 전`;

		return date.toLocaleDateString('ko-KR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getConversationSummary(conversation) {
		const messages = conversation.content?.messages || [];
		if (messages.length === 0) {
			return '(내용 없음)';
		}
		
		const firstUserMessage = messages.find(m => m.role === 'user');
		if (firstUserMessage) {
			return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
		}
		
		return `메시지 ${messages.length}개`;
	}

	function viewConversation(conversation) {
		selectedConversation = conversation;
	}

	function closeDetail() {
		selectedConversation = null;
	}
</script>

<div class="container">
	<div class="header">
		<button class="btn-back" on:click={() => goto('/')}>
			← 돌아가기
		</button>
		<h1>📚 대화 기록</h1>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>대화 기록을 불러오는 중...</p>
		</div>
	{:else if error}
		<div class="error-box">
			{error}
		</div>
	{:else if conversations.length === 0}
		<div class="empty-state">
			<div class="empty-icon">💬</div>
			<h2>아직 저장된 대화가 없습니다</h2>
			<p>실시간 대화를 진행하고 저장하면 여기에 표시됩니다.</p>
			<button class="btn-primary" on:click={() => goto('/')}>
				대화 시작하기
			</button>
		</div>
	{:else}
		<div class="conversations-grid">
			{#each conversations as conversation (conversation.id)}
				<div class="conversation-card">
					<div class="card-header">
						<div class="card-date">
							🕐 {formatDate(conversation.created_at)}
						</div>
						<div class="card-stats">
							💬 {conversation.content?.metadata?.messageCount || 0}개
						</div>
					</div>
					
					<div class="card-summary">
						{getConversationSummary(conversation)}
					</div>
					
					<div class="card-actions">
						<button 
							class="btn-view" 
							on:click={() => viewConversation(conversation)}
						>
							자세히 보기
						</button>
						<button 
							class="btn-delete" 
							on:click={() => handleDelete(conversation.id)}
						>
							🗑️
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- 대화 상세보기 모달 -->
	{#if selectedConversation}
		<div 
			class="modal-overlay" 
			role="button" 
			tabindex="0"
			on:click={closeDetail}
			on:keydown={(e) => e.key === 'Escape' && closeDetail()}
		>
			<div 
				class="modal-content" 
				role="dialog"
				aria-modal="true"
				tabindex="-1"
				on:click|stopPropagation
				on:keydown|stopPropagation
			>
				<div class="modal-header">
					<h2>대화 상세</h2>
					<button class="btn-close" on:click={closeDetail}>✕</button>
				</div>
				
				<div class="modal-body">
					<div class="conversation-meta">
						<div class="meta-item">
							<strong>일시:</strong> {new Date(selectedConversation.created_at).toLocaleString('ko-KR')}
						</div>
						<div class="meta-item">
							<strong>메시지:</strong> {selectedConversation.content?.metadata?.messageCount || 0}개
						</div>
					</div>
					
					<div class="conversation-messages">
						{#if selectedConversation.content?.messages && selectedConversation.content.messages.length > 0}
							{#each selectedConversation.content.messages as message}
								<div class="message {message.role}">
									<div class="message-role">
										{message.role === 'user' ? '👤 나' : '🤖 AI'}
									</div>
									<div class="message-content">
										{message.content}
									</div>
								</div>
							{/each}
						{:else}
							<div class="no-messages">
								<p>파싱된 메시지가 없습니다.</p>
								<details>
									<summary>원본 텍스트 보기</summary>
									<pre class="raw-text">{selectedConversation.content?.text || '(내용 없음)'}</pre>
								</details>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.btn-back {
		padding: 0.75rem 1.5rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-back:hover {
		background: #f9fafb;
		border-color: #667eea;
		transform: translateX(-2px);
	}

	h1 {
		margin: 0;
		color: #333;
	}

	.loading {
		text-align: center;
		padding: 4rem 2rem;
	}

	.spinner {
		width: 50px;
		height: 50px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #667eea;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-box {
		background: #fee;
		color: #c33;
		padding: 2rem;
		border-radius: 15px;
		text-align: center;
		margin: 2rem 0;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 20px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h2 {
		color: #333;
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: #666;
		margin-bottom: 2rem;
	}

	.btn-primary {
		padding: 1rem 2rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 25px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-primary:hover {
		background: #5568d3;
		transform: translateY(-2px);
	}

	.conversations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.conversation-card {
		background: white;
		border-radius: 15px;
		padding: 1.5rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
	}

	.conversation-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid #f3f4f6;
	}

	.card-date {
		color: #6b7280;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.card-stats {
		background: #eff6ff;
		color: #2563eb;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.card-summary {
		color: #374151;
		line-height: 1.6;
		margin-bottom: 1rem;
		min-height: 3rem;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-view {
		flex: 1;
		padding: 0.75rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 10px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-view:hover {
		background: #5568d3;
	}

	.btn-delete {
		padding: 0.75rem 1rem;
		background: #fee;
		color: #ef4444;
		border: none;
		border-radius: 10px;
		font-size: 1.2rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-delete:hover {
		background: #fecaca;
	}

	/* 모달 스타일 */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}

	.modal-content {
		background: white;
		border-radius: 20px;
		width: 100%;
		max-width: 800px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 2px solid #f3f4f6;
	}

	.modal-header h2 {
		margin: 0;
		color: #333;
	}

	.btn-close {
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.2s;
	}

	.btn-close:hover {
		color: #ef4444;
		transform: scale(1.1);
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
	}

	.conversation-meta {
		background: #f9fafb;
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.meta-item {
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.meta-item:last-child {
		margin-bottom: 0;
	}

	.meta-item strong {
		color: #111827;
	}

	.conversation-messages {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.message {
		padding: 1rem;
		border-radius: 12px;
		background: #f9fafb;
	}

	.message.user {
		background: #eff6ff;
		border-left: 4px solid #3b82f6;
	}

	.message.assistant {
		background: #f0fdf4;
		border-left: 4px solid #10b981;
	}

	.message-role {
		font-weight: 600;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.message.user .message-role {
		color: #2563eb;
	}

	.message.assistant .message-role {
		color: #059669;
	}

	.message-content {
		color: #374151;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.no-messages {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.no-messages details {
		margin-top: 1rem;
		text-align: left;
	}

	.no-messages summary {
		cursor: pointer;
		color: #667eea;
		font-weight: 600;
	}

	.raw-text {
		background: #f9fafb;
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		font-size: 0.85rem;
		margin-top: 0.5rem;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	@media (max-width: 768px) {
		.conversations-grid {
			grid-template-columns: 1fr;
		}

		.modal-overlay {
			padding: 1rem;
		}

		.modal-body {
			padding: 1rem;
		}
	}
</style>
