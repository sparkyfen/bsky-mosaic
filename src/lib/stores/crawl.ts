import { writable } from 'svelte/store';
import type { PhotoPost, ProfileInfo } from '$lib/api/bluesky.js';

export interface CrawlState {
	isActive: boolean;
	depth: number;
	accountsFound: number;
	currentHandle: string;
	photosFound: number;
	error: string | null;
}

export const crawlState = writable<CrawlState>({
	isActive: false,
	depth: 0,
	accountsFound: 0,
	currentHandle: '',
	photosFound: 0,
	error: null
});

export const photoPosts = writable<PhotoPost[]>([]);

export const currentProfile = writable<ProfileInfo | null>(null);

export function resetCrawl() {
	crawlState.set({
		isActive: false,
		depth: 0,
		accountsFound: 0,
		currentHandle: '',
		photosFound: 0,
		error: null
	});
	photoPosts.set([]);
	currentProfile.set(null);
}
