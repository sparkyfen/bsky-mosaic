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
		posts
			.filter((p) => {
				if (p.nsfw && $settings.nsfwMode === 'hide') return false;
				if (p.isRepost && !$settings.showReposts) return false;
				if ($settings.onlyAltText && !p.images.some((img) => img.alt)) return false;
				if (p.images.length < $settings.minImagesPerPost) return false;
				return true;
			})
			.sort((a, b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime())
	);


</script>

<div class="mosaic">
	{#each filteredPosts as post (post.uri)}
		<PhotoCard
			images={post.images}
			author={post.author}
			isRepost={post.isRepost}
			nsfw={post.nsfw}
			onclick={(idx) => onPhotoClick?.(post, idx)}
			onhide={(did) => onHideAccount?.(did)}
		/>
	{/each}
</div>

<style>
	.mosaic {
		columns: 4 280px;
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
