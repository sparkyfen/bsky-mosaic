<script lang="ts">
	import { goto } from '$app/navigation';

	let handle = $state('');

	function onSubmit(e: Event) {
		e.preventDefault();
		const cleaned = handle.trim().replace(/^@/, '');
		if (cleaned) {
			goto(`/mosaic/${encodeURIComponent(cleaned)}`);
			handle = '';
		}
	}

	function onClear() {
		handle = '';
	}
</script>

<form class="search-box" onsubmit={onSubmit}>
	<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	</svg>
	<input
		type="text"
		bind:value={handle}
		placeholder="Search accounts on Bluesky..."
	/>
	{#if handle}
		<button type="button" class="clear-btn" onclick={onClear} aria-label="Clear">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
		</button>
	{/if}
</form>

<style>
	.search-box {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 400px;
		padding: 6px 8px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--search-bg);
	}

	.search-icon {
		color: var(--fg-dim);
		flex-shrink: 0;
	}

	input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: var(--fg);
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		line-height: 1.43;
	}

	input::placeholder {
		color: var(--fg-subtle);
	}

	.clear-btn {
		background: none;
		border: none;
		color: var(--fg-dim);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.clear-btn:hover {
		color: var(--fg);
	}
</style>
