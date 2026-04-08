<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error-page">
	<div class="error-content">
		<span class="error-code">{page.status}</span>
		<h1>
			{#if page.status === 404}
				Page not found
			{:else if page.status === 500}
				Something went wrong
			{:else}
				Error
			{/if}
		</h1>
		<p>{page.error?.message || 'An unexpected error occurred.'}</p>
		<a href="/" class="home-link">Back to home</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 64px);
		padding: 2rem;
	}

	.error-content {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.error-code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 64px;
		font-weight: 700;
		color: var(--accent-purple);
		opacity: 0.5;
	}

	h1 {
		font-family: 'Geist', sans-serif;
		font-size: 24px;
		font-weight: 700;
		color: var(--fg);
	}

	p {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg-dim);
		max-width: 400px;
	}

	.home-link {
		margin-top: 8px;
		padding: 10px 20px;
		border-radius: 9999px;
		background: var(--accent-purple);
		color: #ffffff;
		text-decoration: none;
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		transition: background 0.2s;
	}

	.home-link:hover {
		background: var(--accent-purple-hover);
	}
</style>
