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

	let accountsText = $state(String(accountsPerLevel));
	let postsText = $state(String(postsPerAccount));

	function handleAccountsBlur() {
		const val = parseInt(accountsText);
		if (!val || val < 1) {
			accountsText = '50';
			onAccountsChange(50);
		} else {
			const clamped = Math.min(val, 200);
			accountsText = String(clamped);
			onAccountsChange(clamped);
		}
	}

	function handlePostsBlur() {
		const val = parseInt(postsText);
		if (!val || val < 1) {
			postsText = '50';
			onPostsChange(50);
		} else {
			const clamped = Math.min(val, 500);
			postsText = String(clamped);
			onPostsChange(clamped);
		}
	}
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
			type="text"
			inputmode="numeric"
			bind:value={accountsText}
			onblur={handleAccountsBlur}
			disabled={isActive}
		/>
	</label>

	<label class="control-group">
		<span>Posts/account:</span>
		<input
			type="text"
			inputmode="numeric"
			bind:value={postsText}
			onblur={handlePostsBlur}
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

	.control-group input[type='text'] {
		width: 70px;
		padding: 6px 8px;
		border: 1px solid var(--border);
		border-radius: 6px;
		text-align: center;
		font-family: 'Geist Mono', monospace;
		font-size: 13px;
		background: var(--input-bg);
		color: var(--fg);
		outline: none;
	}

	.control-group input[type='text']:focus {
		border-color: var(--accent-purple);
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
