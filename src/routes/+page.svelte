<script lang="ts">
	import { goto } from '$app/navigation';

	let handle = $state('');

	function onSubmit(e: Event) {
		e.preventDefault();
		const cleaned = handle.trim().replace(/^@/, '');
		if (cleaned) {
			goto(`/mosaic/${encodeURIComponent(cleaned)}`);
		}
	}
</script>

<div class="home">
	<div class="hero">
		<svg class="hero-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
		</svg>
		<h1>BlueMosaic</h1>
		<p class="subtitle">Explore photos from any Bluesky profile in a visual mosaic</p>
		<form class="home-search" onsubmit={onSubmit}>
			<input
				type="text"
				bind:value={handle}
				placeholder="Enter a handle (e.g. alice.bsky.social)"
			/>
			<button type="submit" disabled={!handle.trim()}>Explore</button>
		</form>
	</div>
</div>

<style>
	.home {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 64px);
		padding: 2rem;
		background: var(--bg);
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 12px;
	}

	h1 {
		font-family: 'Geist', sans-serif;
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--fg);
	}

	.subtitle {
		color: var(--fg-dim);
		font-family: 'Geist', sans-serif;
		font-size: 16px;
		margin-bottom: 16px;
	}

	.home-search {
		display: flex;
		gap: 8px;
		width: 100%;
		max-width: 500px;
	}

	input {
		flex: 1;
		padding: 10px 16px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		outline: none;
		background: var(--input-bg);
		color: var(--fg);
		transition: border-color 0.2s;
	}

	input:focus {
		border-color: var(--accent-purple);
	}

	input::placeholder {
		color: var(--fg-subtle);
	}

	button {
		padding: 10px 20px;
		background: var(--accent-purple);
		color: #ffffff;
		border: none;
		border-radius: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	button:hover:not(:disabled) {
		background: var(--accent-purple-hover);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
