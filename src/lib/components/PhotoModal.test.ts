// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import type { PhotoPost } from '$lib/api/bluesky.js';
import type { EntailPostResult } from '$lib/api/entail.js';

const getPostTags = vi.fn<() => Promise<EntailPostResult>>();

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api/entail.js', () => ({ getPostTags: (...args: unknown[]) => getPostTags(...(args as [])) }));
vi.mock('$lib/stores/auth.js', () => ({
	// Signed in as a FurryList member with age verification, so the e621
	// tags panel is enabled.
	authState: writable({
		isAuthenticated: true,
		handle: 'viewer.example',
		did: 'did:plc:viewer',
		avatar: null,
		displayName: null,
		uwu: true,
		adultContentEnabled: true,
		ageVerified: true
	}),
	followUser: vi.fn(),
	unfollowUser: vi.fn(),
	getFollowStatus: vi.fn(async () => null),
	likePost: vi.fn(),
	unlikePost: vi.fn(),
	getLikeStatus: vi.fn(async () => null)
}));
vi.mock('$lib/stores/settings.js', () => ({
	settings: writable({ nsfwMode: 'show' })
}));

const { default: PhotoModal } = await import('./PhotoModal.svelte');

const post: PhotoPost = {
	uri: 'at://did:plc:artist/app.bsky.feed.post/3exampleabc12',
	cid: 'bafypost',
	author: { did: 'did:plc:artist', handle: 'artist.example', displayName: 'Artist', avatar: '' },
	images: [{ cid: 'bafkreiexamplecid', thumb: '', fullsize: '', alt: '' }],
	indexedAt: '2024-10-04T06:49:55.510Z',
	parentChain: [],
	isRepost: false,
	labels: [],
	nsfw: false
} as PhotoPost;

const ready: EntailPostResult = {
	status: 'ready',
	post: {
		uri: post.uri,
		model_version: 'furry_conv_next_base_384',
		router_model_version: null,
		images: [
			{
				cid: 'bafkreiexamplecid',
				rating: 'safe',
				rating_score: 0.9,
				router: null,
				routed_pass: true,
				tags: [{ name: 'red_panda', confidence: 0.97 }]
			}
		]
	}
};

describe('PhotoModal e621 tags', () => {
	beforeEach(() => getPostTags.mockReset());

	it('shows the tags for a classified post', async () => {
		getPostTags.mockResolvedValue(ready);
		render(PhotoModal, { post, imageIndex: 0, onclose: () => {} });
		expect(await screen.findByText('red_panda')).toBeTruthy();
	});

	it('says the tags are not ready for a queued post, and loads them on Try again', async () => {
		getPostTags.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce(ready);
		render(PhotoModal, { post, imageIndex: 0, onclose: () => {} });

		expect(await screen.findByText("Tags aren't ready yet.")).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

		expect(await screen.findByText('red_panda')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
	});
});
