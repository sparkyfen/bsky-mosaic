<script lang="ts">
	import type { PhotoImage, ProfileInfo } from '$lib/api/bluesky.js';
	import { settings } from '$lib/stores/settings.js';

	interface Props {
		images: PhotoImage[];
		author: ProfileInfo;
		isRepost?: boolean;
		nsfw?: boolean;
		onclick?: (imageIndex: number) => void;
		onhide?: (did: string) => void;
	}

	let { images, author, isRepost = false, nsfw = false, onclick, onhide }: Props = $props();

	let revealed = $state(false);
	let hovered = $state(false);
	let currentIndex = $state(0);
	let touchStartX = 0;
	let touchStartY = 0;

	const image = $derived(images[currentIndex]);
	const hasMultiple = $derived(images.length > 1);

	const aspectRatio = $derived(
		image.aspectRatio
			? `${image.aspectRatio.width} / ${image.aspectRatio.height}`
			: 'auto'
	);

	const initials = $derived(
		(author.displayName || author.handle).slice(0, 2).toUpperCase()
	);

	const shouldBlur = $derived(nsfw && $settings.nsfwMode === 'blur' && !revealed);
	const showBadges = $derived($settings.showRepostBadges);

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!hasMultiple) return;
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(dx) < 30 || Math.abs(dy) > Math.abs(dx)) return;
		if (dx < 0 && currentIndex < images.length - 1) {
			e.preventDefault();
			currentIndex++;
		} else if (dx > 0 && currentIndex > 0) {
			e.preventDefault();
			currentIndex--;
		}
	}

	function prev(e: MouseEvent) {
		e.stopPropagation();
		if (currentIndex > 0) currentIndex--;
	}

	function next(e: MouseEvent) {
		e.stopPropagation();
		if (currentIndex < images.length - 1) currentIndex++;
	}
</script>

<button
	class="photo-card"
	onclick={shouldBlur ? undefined : () => onclick?.(currentIndex)}
	type="button"
	class:blurred={shouldBlur}
	onmouseenter={() => hovered = true}
	onmouseleave={() => hovered = false}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
>
	<img
		src={image.thumb}
		alt={image.alt || `Photo by ${author.displayName || author.handle}`}
		loading="lazy"
		style:aspect-ratio={aspectRatio}
	/>

	{#if hasMultiple && !shouldBlur}
		<div class="carousel-dots">
			{#each images as _, i}
				<span class="dot" class:active={i === currentIndex}></span>
			{/each}
		</div>
		{#if currentIndex > 0}
			<button class="carousel-arrow left" onclick={prev} type="button" aria-label="Previous image">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
			</button>
		{/if}
		{#if currentIndex < images.length - 1}
			<button class="carousel-arrow right" onclick={next} type="button" aria-label="Next image">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
			</button>
		{/if}
	{/if}

	{#if shouldBlur}
		<div class="nsfw-overlay">
			<svg class="nsfw-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
				<path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
				<path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
				<path d="m2 2 20 20" />
			</svg>
			<span class="nsfw-title">Sensitive Content</span>
			<span class="nsfw-subtitle">This image may contain adult content</span>
			<button class="nsfw-reveal" class:visible={hovered} onclick={(e) => { e.stopPropagation(); revealed = true; }} type="button">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				<span>Show Content</span>
			</button>
		</div>
		<div class="nsfw-badge">18+</div>
	{/if}

	{#if isRepost && showBadges && !shouldBlur}
		<div class="repost-badge">
			<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="m2 9 3-3 3 3" />
				<path d="M13 18H7a2 2 0 0 1-2-2V6" />
				<path d="m22 15-3 3-3-3" />
				<path d="M11 6h6a2 2 0 0 1 2 2v10" />
			</svg>
			<span>Reposted</span>
		</div>
	{/if}

	{#if !shouldBlur}
		<div class="overlay">
			<div class="overlay-left">
				<div class="overlay-avatar">
					{#if author.avatar}
						<img src={author.avatar} alt="" />
					{:else}
						<span class="avatar-initials">{initials}</span>
					{/if}
				</div>
				<span class="overlay-name">{author.displayName || author.handle}</span>
			</div>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<span
				class="hide-btn"
				role="button"
				tabindex="0"
				title="Not interested in this account"
				onclick={(e) => { e.stopPropagation(); onhide?.(author.did); }}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10" />
					<path d="m4.9 4.9 14.2 14.2" />
				</svg>
			</span>
		</div>
	{/if}
</button>

<style>
	.photo-card {
		display: block;
		width: 100%;
		break-inside: avoid;
		margin-bottom: 16px;
		border-radius: 16px;
		overflow: hidden;
		position: relative;
		cursor: pointer;
		border: none;
		padding: 0;
		background: var(--card-bg);
		transition: transform 0.2s;
	}

	.photo-card:hover {
		transform: scale(1.02);
	}

	.photo-card.blurred {
		cursor: default;
	}

	.photo-card.blurred:hover {
		transform: none;
	}

	.photo-card > img {
		width: 100%;
		display: block;
		object-fit: cover;
	}

	/* Carousel */
	.carousel-dots {
		position: absolute;
		bottom: 62px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 6px;
		padding: 4px 8px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 10px;
		z-index: 3;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.photo-card:hover .carousel-dots {
		opacity: 1;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.4);
		transition: background 0.2s;
	}

	.dot.active {
		background: var(--accent-purple);
	}

	.carousel-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.6);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 3;
		transition: background 0.15s, opacity 0.2s;
		border: none;
		padding: 0;
		opacity: 0;
	}

	.photo-card:hover .carousel-arrow {
		opacity: 1;
	}

	.carousel-arrow:hover {
		background: rgba(0, 0, 0, 0.9);
	}

	.carousel-arrow.left {
		left: 8px;
	}

	.carousel-arrow.right {
		right: 8px;
	}

	/* NSFW overlay */
	.nsfw-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: #ffffff;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		padding: 12px;
	}

	.nsfw-icon {
		opacity: 0.7;
		margin-bottom: 4px;
	}

	.nsfw-title {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
	}

	.nsfw-subtitle {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		color: #A1A1AA;
	}

	.nsfw-reveal {
		display: none;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 9999px;
		border: 1px solid #ffffff;
		background: transparent;
		color: #ffffff;
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		margin-top: 4px;
		transition: background 0.2s;
	}

	.nsfw-reveal.visible {
		display: flex;
	}

	.nsfw-reveal:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.nsfw-badge {
		position: absolute;
		top: 8px;
		right: 8px;
		padding: 4px 8px;
		border-radius: 9999px;
		background: #FF5C33;
		color: #ffffff;
		font-family: 'Geist', sans-serif;
		font-size: 10px;
		font-weight: 700;
		z-index: 2;
	}

	.repost-badge {
		position: absolute;
		top: 8px;
		left: 8px;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border-radius: 9999px;
		background: rgba(10, 10, 10, 0.8);
		color: var(--accent-purple);
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		z-index: 2;
	}

	.overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 12px;
		height: 56px;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
		display: flex;
		align-items: center;
		justify-content: space-between;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.photo-card:hover .overlay {
		opacity: 1;
	}

	.overlay-left {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.hide-btn {
		color: #A1A1AA;
		cursor: pointer;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: 50%;
		transition: color 0.15s, background 0.15s;
	}

	.hide-btn:hover {
		color: #FF5C33;
		background: rgba(0, 0, 0, 0.4);
	}

	.overlay-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #E7E8E5;
		border: 1px solid rgba(255, 255, 255, 0.2);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.overlay-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		font-weight: 600;
		color: #111111;
	}

	.overlay-name {
		color: #ffffff;
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		font-weight: 600;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}

	@media (max-width: 768px) {
		.nsfw-reveal {
			display: flex;
		}

		.photo-card {
			margin-bottom: 8px;
			border-radius: 12px;
		}

		.carousel-dots {
			opacity: 1;
			bottom: 54px;
		}

		.overlay {
			opacity: 1;
			height: 48px;
			padding: 8px;
		}

		.overlay-name {
			font-size: 11px;
		}

		.overlay-avatar {
			width: 24px;
			height: 24px;
		}
	}
</style>
