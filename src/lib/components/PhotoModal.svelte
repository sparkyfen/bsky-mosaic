<script lang="ts">
	import type { PhotoPost } from '$lib/api/bluesky.js';
	import { goto } from '$app/navigation';
	import { authState, followUser, unfollowUser, getFollowStatus } from '$lib/stores/auth.js';
	import DiscoveryPath from './DiscoveryPath.svelte';

	interface Props {
		post: PhotoPost;
		imageIndex: number;
		onclose: () => void;
	}

	let { post, imageIndex, onclose }: Props = $props();

	const image = $derived(post.images[imageIndex]);
	const rkey = $derived(post.uri.split('/').pop() || '');
	const bskyUrl = $derived(`https://bsky.app/profile/${post.author.handle}/post/${rkey}`);

	let followUri = $state<string | null>(null);
	let followLoading = $state(false);

	$effect(() => {
		if ($authState.isAuthenticated && post.author.did !== $authState.did) {
			checkFollow(post.author.did);
		}
	});

	async function checkFollow(did: string) {
		try {
			followUri = await getFollowStatus(did);
		} catch {
			followUri = null;
		}
	}

	async function handleFollow() {
		if (followLoading) return;
		followLoading = true;
		try {
			if (followUri) {
				await unfollowUser(followUri);
				followUri = null;
			} else {
				followUri = await followUser(post.author.did);
			}
		} catch (err) {
			console.error('Follow/unfollow failed:', err);
		} finally {
			followLoading = false;
		}
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<div class="backdrop" onclick={onBackdropClick} role="presentation">
	<div class="modal" role="dialog" aria-modal="true">
		<button class="close-btn" onclick={onclose} aria-label="Close">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
		</button>

		<div class="modal-content">
			<img class="full-image" src={image.fullsize} alt={image.alt || ''} />

			<div class="details">
				<div class="author-row">
					<button class="author-info" type="button" onclick={() => { window.open(`/mosaic/${encodeURIComponent(post.author.handle)}`, '_blank'); }}>
						<div class="avatar">
							{#if post.author.avatar}
								<img src={post.author.avatar} alt="" />
							{:else}
								<span class="avatar-initials">{(post.author.displayName || post.author.handle).slice(0, 2).toUpperCase()}</span>
							{/if}
						</div>
						<div class="author-text">
							<span class="display-name">{post.author.displayName || post.author.handle}</span>
							<span class="handle">@{post.author.handle}</span>
						</div>
					</button>
					{#if $authState.isAuthenticated && post.author.did !== $authState.did}
						<button
							class="follow-btn"
							class:following={!!followUri}
							onclick={handleFollow}
							disabled={followLoading}
							type="button"
						>
							{#if followLoading}
								...
							{:else if followUri}
								<span class="follow-label">Following</span>
								<span class="unfollow-label">Unfollow</span>
							{:else}
								Follow
							{/if}
						</button>
					{/if}
				</div>

				<a href={bskyUrl} target="_blank" rel="noopener noreferrer" class="bsky-link">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" x2="21" y1="14" y2="3" />
					</svg>
					Open in Bluesky
				</a>

				{#if post.parentChain.length > 0}
					<div class="discovery-section">
						<h3>Discovery Path</h3>
						<DiscoveryPath chain={post.parentChain} current={post.author} onnavigate={onclose} />
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 2rem;
	}

	.modal {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 16px;
		max-width: 900px;
		max-height: 90vh;
		overflow-y: auto;
		position: relative;
		width: 100%;
	}

	.close-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		background: rgba(0, 0, 0, 0.6);
		color: #ffffff;
		border: none;
		border-radius: 50%;
		width: 36px;
		height: 36px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
		transition: background 0.2s;
	}

	.close-btn:hover {
		background: rgba(0, 0, 0, 0.9);
	}

	.modal-content {
		display: flex;
		flex-direction: column;
	}

	.full-image {
		width: 100%;
		max-height: 60vh;
		object-fit: contain;
		background: #000;
		border-radius: 16px 16px 0 0;
	}

	.details {
		padding: 24px;
	}

	.author-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 12px;
		background: none;
		border: 1px solid transparent;
		border-radius: 12px;
		padding: 8px;
		margin-left: -8px;
		cursor: pointer;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.author-info:hover {
		border-color: var(--border);
	}

	.avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--bg-muted);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 600;
		color: var(--fg);
	}

	.author-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-align: left;
	}

	.display-name {
		font-family: 'Geist', sans-serif;
		font-weight: 600;
		font-size: 16px;
		color: var(--fg);
	}

	.handle {
		font-family: 'Geist Mono', monospace;
		color: var(--fg-subtle);
		font-size: 13px;
	}

	.bsky-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: transparent;
		border: 1px solid var(--border);
		color: var(--accent-purple);
		text-decoration: none;
		border-radius: 9999px;
		font-family: 'JetBrains Mono', monospace;
		font-weight: 500;
		font-size: 14px;
		margin-bottom: 16px;
		transition: background 0.2s;
	}

	.bsky-link:hover {
		background: var(--bg-muted);
	}

	.discovery-section {
		border-top: 1px solid var(--border);
		padding-top: 16px;
	}

	.discovery-section h3 {
		margin: 0 0 12px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		color: var(--fg-dim);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.follow-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 600;
		color: #ffffff;
		padding: 10px 20px;
		border-radius: 9999px;
		border: none;
		background: var(--accent-purple);
		cursor: pointer;
		height: 40px;
		flex-shrink: 0;
		transition: background 0.2s;
	}

	.follow-btn:hover:not(:disabled) {
		background: var(--accent-purple-hover);
	}

	.follow-btn.following {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--fg-muted);
	}

	.follow-btn.following .unfollow-label {
		display: none;
	}

	.follow-btn.following:hover:not(:disabled) {
		border-color: #FF5C33;
		color: #FF5C33;
	}

	.follow-btn.following:hover:not(:disabled) .follow-label {
		display: none;
	}

	.follow-btn.following:hover:not(:disabled) .unfollow-label {
		display: inline;
	}

	.follow-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
