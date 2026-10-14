// Offline stand-in for @atproto/api's BskyAgent, for tests that mock the
// module: vi.mock('@atproto/api', async () => ({ BskyAgent: (await import('$lib/test/bsky.js')).FakeAgent })).
// Each test sets `appview` to the profile and thread the fake AppView returns.

import type { AuthState } from '$lib/stores/auth.js';

export const NAME = 'Example Artist';
export const BIO = 'bio-marker';
export const AVATAR = 'https://cdn.example/avatar-marker.jpg';
export const TEXT = 'post-text-marker';
export const IMAGE = 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:example/bafkreiexampleimage@jpeg';
const THUMB = 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:example/bafkreiexampleimage@jpeg';
const URI = 'at://did:plc:example/app.bsky.feed.post/3exampleabc12';

/** The self-label Bluesky sets when an author hides their content from logged-out viewers. */
export const OPT_OUT = {
	src: 'did:plc:example',
	uri: 'at://did:plc:example/app.bsky.actor.profile/self',
	val: '!no-unauthenticated',
	cts: '2026-01-01T00:00:00.000Z'
};

export const appview: { profile: any; thread: any } = { profile: null, thread: null };

/** The app's signed-out auth state, for tests that mock $lib/stores/auth.js. */
export const LOGGED_OUT: AuthState = {
	isAuthenticated: false,
	handle: null,
	did: null,
	avatar: null,
	displayName: null,
	uwu: false,
	adultContentEnabled: false,
	ageVerified: false
};

/** Pass `null` for a profile with no labels field at all. */
export function profileView(labels: unknown[] | null = []) {
	return {
		did: 'did:plc:example',
		handle: 'artist.example',
		displayName: NAME,
		description: BIO,
		avatar: AVATAR,
		postsCount: 42,
		...(labels && { labels })
	};
}

/** Pass `authorLabels: null` for a post author with no labels field at all. */
export function threadView({
	authorLabels = [] as unknown[] | null,
	postLabels = [] as unknown[],
	images = true
} = {}) {
	return {
		$type: 'app.bsky.feed.defs#threadViewPost',
		post: {
			uri: URI,
			cid: 'bafyreiexamplepost',
			author: {
				did: 'did:plc:example',
				handle: 'artist.example',
				displayName: NAME,
				avatar: AVATAR,
				...(authorLabels && { labels: authorLabels })
			},
			record: {
				text: TEXT,
				embed: images
					? {
							$type: 'app.bsky.embed.images',
							images: [{ image: { ref: { toString: () => 'bafkreiexampleimage' } }, alt: '' }]
						}
					: undefined
			},
			embed: images
				? {
						$type: 'app.bsky.embed.images#view',
						images: [{ thumb: THUMB, fullsize: IMAGE, alt: '', aspectRatio: { width: 4, height: 3 } }]
					}
				: undefined,
			labels: postLabels,
			indexedAt: '2026-01-01T00:00:00.000Z'
		}
	};
}

export class FakeAgent {
	session: unknown;
	constructor(_opts?: unknown, session?: unknown) {
		this.session = session;
	}
	async getProfile(_params: { actor: string }) {
		if (!appview.profile) throw new Error('Profile not found');
		return { data: appview.profile };
	}
	async getPostThread(_params: { uri: string; depth?: number }) {
		if (!appview.thread) throw new Error('Post not found');
		return { data: { thread: appview.thread } };
	}
}
