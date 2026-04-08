<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ProfileInfo } from '$lib/api/bluesky.js';

	interface Props {
		chain: ProfileInfo[];
		current: ProfileInfo;
		onnavigate?: () => void;
	}

	let { chain, current, onnavigate }: Props = $props();

	function navigateTo(handle: string) {
		window.open(`/mosaic/${encodeURIComponent(handle)}`, '_blank');
	}
</script>

<div class="discovery-path">
	{#each chain as node, i}
		<button class="path-node" onclick={() => navigateTo(node.handle)} type="button">
			{#if node.avatar}
				<img class="node-avatar" src={node.avatar} alt="" />
			{:else}
				<span class="node-initials">{(node.displayName || node.handle).slice(0, 2).toUpperCase()}</span>
			{/if}
			<span class="node-handle">@{node.handle}</span>
		</button>
		<span class="arrow">&rarr;</span>
	{/each}
	<button class="path-node current" onclick={() => navigateTo(current.handle)} type="button">
		{#if current.avatar}
			<img class="node-avatar" src={current.avatar} alt="" />
		{:else}
			<span class="node-initials">{(current.displayName || current.handle).slice(0, 2).toUpperCase()}</span>
		{/if}
		<span class="node-handle">@{current.handle}</span>
	</button>
</div>

<style>
	.discovery-path {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.path-node {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 1px solid var(--border);
		border-radius: 9999px;
		background: transparent;
		cursor: pointer;
		transition: background 0.15s;
		font-size: inherit;
		font-family: inherit;
		color: inherit;
	}

	.path-node:hover {
		background: var(--bg-muted);
	}

	.path-node.current {
		background: rgba(168, 85, 247, 0.1);
		border-color: var(--accent-purple);
	}

	.path-node.current:hover {
		background: rgba(168, 85, 247, 0.2);
	}

	.node-avatar {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		object-fit: cover;
	}

	.node-initials {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--bg-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 8px;
		font-weight: 600;
		color: var(--fg);
	}

	.node-handle {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: var(--fg-muted);
	}

	.arrow {
		color: var(--fg-dim);
		font-size: 14px;
	}
</style>
