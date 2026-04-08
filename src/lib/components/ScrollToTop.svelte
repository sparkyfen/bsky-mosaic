<script lang="ts">
	let visible = $state(false);

	function onScroll() {
		visible = window.scrollY > 400;
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:window onscroll={onScroll} />

{#if visible}
	<button class="scroll-top" onclick={scrollToTop} type="button" aria-label="Back to top">
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="m18 15-6-6-6 6" />
		</svg>
		<span>Top</span>
	</button>
{/if}

<style>
	.scroll-top {
		position: fixed;
		bottom: 32px;
		right: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 40px;
		padding: 10px 16px;
		border-radius: 9999px;
		border: none;
		background: var(--accent-purple);
		color: #0A0A0A;
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		z-index: 50;
		transition: background 0.2s, transform 0.2s;
	}

	.scroll-top:hover {
		background: var(--accent-purple-hover);
		transform: translateY(-2px);
	}
</style>
