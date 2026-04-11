<script lang="ts">
	import { onMount } from 'svelte';
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

	onMount(() => {
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = ''; };
	});

	let currentImageIndex = $state(imageIndex);
	const image = $derived(post.images[currentImageIndex]);
	const rkey = $derived(post.uri.split('/').pop() || '');
	const bskyUrl = $derived(`https://bsky.app/profile/${post.author.handle}/post/${rkey}`);
	const hasMultipleImages = $derived(post.images.length > 1);
	const stageStyle = $derived(
		image.aspectRatio
			? `aspect-ratio: ${image.aspectRatio.width} / ${image.aspectRatio.height};`
			: ''
	);

	let fullImageLoaded = $state(false);
	$effect(() => {
		// Reset load state whenever the active image changes
		void image.fullsize;
		fullImageLoaded = false;
	});

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
		} else if (e.key === 'ArrowLeft' && hasMultipleImages && currentImageIndex > 0) {
			currentImageIndex--;
		} else if (e.key === 'ArrowRight' && hasMultipleImages && currentImageIndex < post.images.length - 1) {
			currentImageIndex++;
		}
	}

	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!hasMultipleImages) return;
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(dx) < 30 || Math.abs(dy) > Math.abs(dx)) return;
		if (dx < 0 && currentImageIndex < post.images.length - 1) {
			currentImageIndex++;
		} else if (dx > 0 && currentImageIndex > 0) {
			currentImageIndex--;
		}
	}

	function sharePost() {
		if (navigator.share) {
			navigator.share({ title: `Photo by ${post.author.displayName || post.author.handle}`, url: bskyUrl });
		} else {
			window.open(bskyUrl, '_blank');
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<div class="backdrop" onclick={onBackdropClick} ontouchmove={(e) => e.preventDefault()} role="presentation">
	<div class="modal" role="dialog" aria-modal="true">
		<!-- Desktop close button -->
		<button class="close-btn desktop-only" onclick={onclose} aria-label="Close">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
		</button>

		<div class="modal-content">
			<div class="image-wrapper" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
				<div class="image-stage" style={stageStyle}>
					<img class="thumb-placeholder" src={image.thumb} alt="" aria-hidden="true" />
					<img
						class="full-image"
						class:loaded={fullImageLoaded}
						src={image.fullsize}
						alt={image.alt || ''}
						onload={() => (fullImageLoaded = true)}
					/>
				</div>

				<!-- Mobile nav buttons -->
				<button class="mobile-nav-btn back-btn mobile-only" onclick={onclose} type="button" aria-label="Back">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>
				<button class="mobile-nav-btn share-btn mobile-only" onclick={sharePost} type="button" aria-label="Share">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M7 17l9.2-9.2M17 17V7H7" />
					</svg>
				</button>

				<!-- Dot indicators for multi-image posts -->
				{#if hasMultipleImages}
					<div class="dot-indicators">
						{#each post.images as _, i}
							<button
								class="dot"
								class:active={i === currentImageIndex}
								onclick={() => currentImageIndex = i}
								type="button"
								aria-label="Image {i + 1}"
							></button>
						{/each}
					</div>
				{/if}
			</div>

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
							class="follow-btn desktop-only"
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

				<!-- Desktop: inline link -->
				<a href={bskyUrl} target="_blank" rel="noopener noreferrer" class="bsky-link desktop-only">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" x2="21" y1="14" y2="3" />
					</svg>
					Open in Bluesky
				</a>

				{#if post.parentChain.length > 0}
					<div class="discovery-section desktop-only">
						<h3>Discovery Path</h3>
						<DiscoveryPath chain={post.parentChain} current={post.author} onnavigate={onclose} />
					</div>
				{/if}

				<!-- Mobile: full-width action buttons -->
				<div class="mobile-actions mobile-only">
					<a href={bskyUrl} target="_blank" rel="noopener noreferrer" class="mobile-action-btn outline">
						Open in Bluesky
					</a>
					{#if $authState.isAuthenticated && post.author.did !== $authState.did}
						<button
							class="mobile-action-btn"
							class:following={!!followUri}
							onclick={handleFollow}
							disabled={followLoading}
							type="button"
						>
							{#if followLoading}
								...
							{:else if followUri}
								Following
							{:else}
								Follow
							{/if}
						</button>
					{/if}
				</div>
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
		overscroll-behavior: contain;
		touch-action: none;
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

	.image-wrapper {
		position: relative;
		background: #000;
		border-radius: 16px 16px 0 0;
		overflow: hidden;
	}

	.image-stage {
		position: relative;
		width: 100%;
		max-height: 60vh;
		min-height: 240px;
		display: block;
	}

	.thumb-placeholder,
	.full-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.thumb-placeholder {
		filter: blur(24px);
		transform: scale(1.08);
	}

	.full-image {
		opacity: 0;
		transition: opacity 0.25s ease-out;
	}

	.full-image.loaded {
		opacity: 1;
	}

	/* Mobile nav buttons on image */
	.mobile-nav-btn {
		position: absolute;
		top: 12px;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(10, 10, 10, 0.8);
		color: #ffffff;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
	}

	.back-btn {
		left: 12px;
	}

	.share-btn {
		right: 12px;
	}

	/* Dot indicators */
	.dot-indicators {
		position: absolute;
		bottom: 12px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 8px;
		padding: 6px 12px;
		background: rgba(0, 0, 0, 0.4);
		border-radius: 12px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--fg-subtle);
		border: none;
		padding: 0;
		cursor: pointer;
		transition: background 0.2s;
	}

	.dot.active {
		background: var(--accent-purple);
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

	/* Desktop follow button */
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

	/* Mobile action buttons */
	.mobile-actions {
		display: flex;
		gap: 10px;
		margin-top: 16px;
	}

	.mobile-action-btn {
		flex: 1;
		height: 44px;
		border-radius: 9999px;
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		transition: background 0.2s;
		background: var(--accent-purple);
		color: #ffffff;
		border: none;
	}

	.mobile-action-btn.outline {
		background: transparent;
		border: 1px solid var(--accent-purple);
		color: var(--accent-purple);
	}

	.mobile-action-btn.following {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--fg-muted);
	}

	/* Visibility helpers */
	.mobile-only {
		display: none;
	}

	@media (max-width: 768px) {
		.desktop-only {
			display: none !important;
		}

		.mobile-only {
			display: flex;
		}

		.backdrop {
			padding: 0;
			background: var(--bg);
		}

		.modal {
			border: none;
			border-radius: 0;
			max-height: 100vh;
			height: 100vh;
		}

		.image-wrapper {
			border-radius: 0;
		}

		.image-stage {
			max-height: 45vh;
			min-height: 200px;
		}

		.details {
			padding: 20px 16px;
		}

		.avatar {
			width: 40px;
			height: 40px;
		}

		.display-name {
			font-size: 15px;
		}

		.handle {
			font-size: 12px;
		}

		.author-info {
			margin-left: 0;
			padding: 0;
			border: none;
		}
	}
</style>
