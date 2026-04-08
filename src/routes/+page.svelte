<script lang="ts">
	import { goto } from '$app/navigation';

	let handle = $state('');

	const popularAccounts = [
		{ handle: 'photography.bsky.social', label: 'Photography' },
		{ handle: 'art.bsky.social', label: 'Art' },
		{ handle: 'nasa.bsky.social', label: 'NASA' },
		{ handle: 'nature.bsky.social', label: 'Nature' },
		{ handle: 'nationalgeographic.bsky.social', label: 'NatGeo' },
		{ handle: 'spacex.bsky.social', label: 'SpaceX' },
		{ handle: 'smithsonian.bsky.social', label: 'Smithsonian' },
		{ handle: 'moma.bsky.social', label: 'MoMA' },
	];

	function parseHandle(input: string): string {
		let cleaned = input.trim().replace(/^@/, '');
		const urlMatch = cleaned.match(/bsky\.app\/profile\/([^/?#]+)/);
		if (urlMatch) cleaned = urlMatch[1];
		if (cleaned && !cleaned.includes('.')) cleaned = `${cleaned}.bsky.social`;
		return cleaned;
	}

	function onSubmit(e: Event) {
		e.preventDefault();
		const resolved = parseHandle(handle);
		if (resolved) {
			goto(`/mosaic/${encodeURIComponent(resolved)}`);
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

	<div class="popular">
		<h2>Popular accounts</h2>
		<div class="popular-grid">
			{#each popularAccounts as account}
				<a href="/mosaic/{encodeURIComponent(account.handle)}" class="popular-card">
					<span class="popular-label">{account.label}</span>
					<span class="popular-handle">@{account.handle}</span>
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		align-items: center;
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
		margin-top: 10vh;
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

	/* Popular accounts */
	.popular {
		margin-top: 48px;
		width: 100%;
		max-width: 700px;
	}

	.popular h2 {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 16px;
		text-align: center;
	}

	.popular-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.popular-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 16px;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 12px;
		text-decoration: none;
		transition: border-color 0.2s, background 0.2s;
	}

	.popular-card:hover {
		border-color: var(--accent-purple);
		background: var(--bg-muted);
	}

	.popular-label {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--fg);
	}

	.popular-handle {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: var(--fg-subtle);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.hero {
			margin-top: 5vh;
		}

		h1 {
			font-size: 1.8rem;
		}

		.home-search {
			flex-direction: column;
		}

		.popular {
			margin-top: 32px;
		}

		.popular-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
