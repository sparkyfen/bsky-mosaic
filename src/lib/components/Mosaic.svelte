<script lang="ts">
	import type { PhotoPost } from '$lib/api/bluesky.js';
	import { settings } from '$lib/stores/settings.js';
	import PhotoCard from './PhotoCard.svelte';

	interface Props {
		posts: PhotoPost[];
		onPhotoClick?: (post: PhotoPost, imageIndex: number) => void;
		onHideAccount?: (did: string) => void;
	}

	let { posts, onPhotoClick, onHideAccount }: Props = $props();

	const filteredPosts = $derived(
		posts.filter((p) => {
			// Hide NSFW posts entirely if mode is 'hide'
			if (p.nsfw && $settings.nsfwMode === 'hide') return false;
			// Filter reposts if disabled
			if (p.isRepost && !$settings.showReposts) return false;
			// Only show posts with alt text if enabled
			if ($settings.onlyAltText && !p.images.some((img) => img.alt)) return false;
			// Minimum images filter
			if (p.images.length < $settings.minImagesPerPost) return false;
			return true;
		})
	);

	const columnStyle = $derived(`columns: ${$settings.gridColumns} 200px`);
</script>

<div class="mosaic" style={columnStyle}>
	{#each filteredPosts as post (post.uri)}
		{#each post.images as image, idx}
			<PhotoCard
				{image}
				author={post.author}
				isRepost={post.isRepost}
				nsfw={post.nsfw}
				onclick={() => onPhotoClick?.(post, idx)}
				onhide={(did) => onHideAccount?.(did)}
			/>
		{/each}
	{/each}
</div>

<style>
	.mosaic {
		column-gap: 16px;
		padding: 24px;
		background: var(--mosaic-bg);
	}

	@media (max-width: 768px) {
		.mosaic {
			columns: 2 !important;
			column-gap: 8px;
			padding: 8px 16px;
		}
	}
</style>
