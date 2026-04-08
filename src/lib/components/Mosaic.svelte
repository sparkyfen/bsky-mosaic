<script lang="ts">
	import type { PhotoPost } from '$lib/api/bluesky.js';
	import PhotoCard from './PhotoCard.svelte';

	interface Props {
		posts: PhotoPost[];
		onPhotoClick?: (post: PhotoPost, imageIndex: number) => void;
		onHideAccount?: (did: string) => void;
	}

	let { posts, onPhotoClick, onHideAccount }: Props = $props();
</script>

<div class="mosaic">
	{#each posts as post (post.uri)}
		{#each post.images as image, idx}
			<PhotoCard
				{image}
				author={post.author}
				isRepost={post.isRepost}
				onclick={() => onPhotoClick?.(post, idx)}
				onhide={(did) => onHideAccount?.(did)}
			/>
		{/each}
	{/each}
</div>

<style>
	.mosaic {
		columns: 4 280px;
		column-gap: 16px;
		padding: 24px;
		background: var(--mosaic-bg);
	}

	@media (max-width: 1200px) {
		.mosaic {
			columns: 3 240px;
		}
	}

	@media (max-width: 768px) {
		.mosaic {
			columns: 2 160px;
			column-gap: 12px;
			padding: 16px;
		}
	}
</style>
