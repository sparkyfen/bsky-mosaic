<script lang="ts">
	interface Props {
		depth: number;
		accountsPerLevel: number;
		postsPerAccount: number;
		isActive: boolean;
		onCrawl: () => void;
		onDepthChange: (depth: number) => void;
		onAccountsChange: (accounts: number) => void;
		onPostsChange: (posts: number) => void;
	}

	let {
		depth,
		accountsPerLevel,
		postsPerAccount,
		isActive,
		onCrawl,
		onDepthChange,
		onAccountsChange,
		onPostsChange
	}: Props = $props();
</script>

<div class="controls">
	<label class="control-group">
		<span>Depth: {depth}</span>
		<input
			type="range"
			min="1"
			max="5"
			value={depth}
			oninput={(e) => onDepthChange(parseInt(e.currentTarget.value))}
			disabled={isActive}
		/>
	</label>

	<label class="control-group">
		<span>Accounts/level:</span>
		<input
			type="number"
			min="1"
			max="200"
			value={accountsPerLevel}
			oninput={(e) => onAccountsChange(parseInt(e.currentTarget.value) || 50)}
			disabled={isActive}
		/>
	</label>

	<label class="control-group">
		<span>Posts/account:</span>
		<input
			type="number"
			min="10"
			max="500"
			value={postsPerAccount}
			oninput={(e) => onPostsChange(parseInt(e.currentTarget.value) || 50)}
			disabled={isActive}
		/>
	</label>

	<button class="crawl-btn" onclick={onCrawl} disabled={isActive}>
		{isActive ? 'Crawling...' : 'Crawl Reposts'}
	</button>
</div>

<style>
	.controls {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 16px 24px;
		background: var(--controls-bg);
		border-bottom: 1px solid var(--border);
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: 'Geist Mono', monospace;
		font-size: 13px;
		color: var(--controls-fg);
	}

	.control-group input[type='range'] {
		width: 120px;
		accent-color: var(--accent-purple);
	}

	.control-group input[type='number'] {
		width: 70px;
		padding: 6px 8px;
		border: 1px solid var(--border);
		border-radius: 6px;
		text-align: center;
		font-family: 'Geist Mono', monospace;
		font-size: 13px;
		background: var(--input-bg);
		color: var(--fg);
	}

	.crawl-btn {
		padding: 8px 16px;
		background: var(--accent-purple);
		color: #ffffff;
		border: none;
		border-radius: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.crawl-btn:hover:not(:disabled) {
		background: var(--accent-purple-hover);
	}

	.crawl-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
