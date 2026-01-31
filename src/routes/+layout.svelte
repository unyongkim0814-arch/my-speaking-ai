<script>
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initAuth } from '$lib/stores/authStore';

	let { children } = $props();
	
	onMount(() => {
		// 앱 시작 시 인증 상태 초기화
		initAuth();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
