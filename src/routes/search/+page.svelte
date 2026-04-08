<script lang="ts">
	import { goto } from '$app/navigation';

	let handle = $state('');

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

<div class="search-page">
	<h1>Search</h1>
	<p class="subtitle">Find a Bluesky account to explore</p>
	<form class="search-form" onsubmit={onSubmit}>
		<input
			type="text"
			bind:value={handle}
			placeholder="Enter a handle (e.g. alice.bsky.social)"
		/>
		<button type="submit" disabled={!handle.trim()}>Search</button>
	</form>
</div>

<style>
	.search-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 12px;
		min-height: calc(100vh - 200px);
	}

	h1 {
		font-family: 'Geist', sans-serif;
		font-size: 24px;
		font-weight: 700;
		color: var(--fg);
	}

	.subtitle {
		color: var(--fg-dim);
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		margin-bottom: 16px;
	}

	.search-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		max-width: 400px;
	}

	input {
		padding: 12px 16px;
		border: 1px solid var(--border);
		border-radius: 9999px;
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
		padding: 12px 20px;
		background: var(--accent-purple);
		color: #ffffff;
		border: none;
		border-radius: 9999px;
		font-family: 'Geist', sans-serif;
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
