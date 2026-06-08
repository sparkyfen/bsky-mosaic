import { BskyAgent } from '@atproto/api';

const PUBLIC_API = 'https://public.api.bsky.app';

export function createAgent(service: string = PUBLIC_API): BskyAgent {
	const agent = new BskyAgent({ service });
	// Note: User-Agent is a forbidden header in browsers and cannot be overridden.
	// The browser's default User-Agent is sent with all fetch requests.
	// For server-side usage, the AT Protocol SDK uses its own User-Agent.
	return agent;
}

export interface ProfileInfo {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
	description?: string;
	postsCount?: number;
	followsCount?: number;
	followersCount?: number;
	requiresAuth?: boolean;
}

export type ContentLabel = 'sexual' | 'nudity' | 'porn' | 'graphic-media' | 'gore';

const NSFW_LABELS = new Set<string>(['sexual', 'sexual-figurative', 'nudity', 'porn', 'graphic-media', 'gore']);

export function isNsfw(labels: string[]): boolean {
	return labels.some((l) => NSFW_LABELS.has(l));
}

export interface PhotoPost {
	uri: string;
	cid: string;
	author: ProfileInfo;
	images: PhotoImage[];
	indexedAt: string;
	parentChain: ProfileInfo[];
	isRepost: boolean;
	labels: string[];
	nsfw: boolean;
}

export interface PhotoImage {
	cid: string;
	thumb: string;
	fullsize: string;
	alt: string;
	aspectRatio?: { width: number; height: number };
}

export function extractImageCids(record: any): string[] {
	const embed = record?.embed;
	if (!embed) return [];
	let images: any[] | undefined;
	if (embed.$type === 'app.bsky.embed.images') {
		images = embed.images;
	} else if (embed.$type === 'app.bsky.embed.recordWithMedia' && embed.media?.$type === 'app.bsky.embed.images') {
		images = embed.media.images;
	}
	return (images ?? []).map((i: any) => i?.image?.ref?.toString() ?? '');
}

export async function getProfile(agent: BskyAgent, handle: string): Promise<ProfileInfo> {
	const res = await agent.getProfile({ actor: handle });
	const requiresAuth = Array.isArray(res.data.labels) &&
		res.data.labels.some((l: any) => l.val === '!no-unauthenticated');
	return {
		did: res.data.did,
		handle: res.data.handle,
		displayName: res.data.displayName,
		avatar: res.data.avatar,
		description: res.data.description,
		postsCount: res.data.postsCount,
		followsCount: res.data.followsCount,
		followersCount: res.data.followersCount,
		requiresAuth
	};
}

/**
 * Map an AT Protocol post view (from getAuthorFeed, getPosts, searchPosts, etc.)
 * into our PhotoPost shape. Returns null if the post has no image embed or is
 * hidden from logged-out viewers.
 */
export function postViewToPhotoPost(
	post: any,
	isRepost: boolean,
	isAuthenticated: boolean
): PhotoPost | null {
	const embed = post.embed;

	// Skip posts from authors who require authentication
	if (!isAuthenticated && Array.isArray(post.author?.labels)) {
		if (post.author.labels.some((l: any) => l.val === '!no-unauthenticated')) {
			return null;
		}
	}

	// Extract content labels
	const labels: string[] = [];
	if (post.labels && Array.isArray(post.labels)) {
		for (const label of post.labels) {
			if (label.val) labels.push(label.val);
		}
	}

	const images: PhotoImage[] = [];
	const recordCids = extractImageCids(post.record);

	const pushImages = (imgs: any[]) => {
		imgs.forEach((img: any, idx: number) => {
			images.push({
				cid: recordCids[idx] ?? '',
				thumb: img.thumb,
				fullsize: img.fullsize,
				alt: img.alt || '',
				aspectRatio: img.aspectRatio
			});
		});
	};

	if (embed?.$type === 'app.bsky.embed.images#view') {
		pushImages(embed.images);
	} else if (embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
		const media = embed.media;
		if (media?.$type === 'app.bsky.embed.images#view') {
			pushImages(media.images);
		}
	}

	if (images.length === 0) return null;

	return {
		uri: post.uri,
		cid: post.cid,
		author: {
			did: post.author.did,
			handle: post.author.handle,
			displayName: post.author.displayName,
			avatar: post.author.avatar
		},
		images,
		indexedAt: post.indexedAt,
		parentChain: [],
		isRepost,
		labels,
		nsfw: isNsfw(labels)
	};
}

export async function getPhotoPosts(
	agent: BskyAgent,
	handle: string,
	cursor?: string,
	limit: number = 50
): Promise<{ posts: PhotoPost[]; cursor?: string }> {
	const res = await agent.getAuthorFeed({
		actor: handle,
		filter: 'posts_with_media',
		limit,
		cursor
	});

	const isAuthenticated = !!agent.session;
	const posts: PhotoPost[] = [];

	for (const item of res.data.feed) {
		const isRepost = item.reason?.$type === 'app.bsky.feed.defs#reasonRepost';
		const mapped = postViewToPhotoPost(item.post, isRepost, isAuthenticated);
		if (mapped) posts.push(mapped);
	}

	return { posts, cursor: res.data.cursor };
}

/**
 * Hydrate an ordered list of at:// post URIs into PhotoPosts. Used to render
 * entail tag-search matches (which only carry uri+cid) in the Mosaic. Batches
 * into the 25-uri limit of app.bsky.feed.getPosts and preserves input order.
 */
export async function getPhotoPostsByUris(agent: BskyAgent, uris: string[]): Promise<PhotoPost[]> {
	const isAuthenticated = !!agent.session;
	const unique = [...new Set(uris)];
	const byUri = new Map<string, PhotoPost>();

	for (let i = 0; i < unique.length; i += 25) {
		const chunk = unique.slice(i, i + 25);
		const res = await agent.getPosts({ uris: chunk });
		for (const post of res.data.posts) {
			const mapped = postViewToPhotoPost(post, false, isAuthenticated);
			if (mapped) byUri.set(post.uri, mapped);
		}
	}

	// Preserve the order of the input uris (dropping any that didn't resolve)
	const seen = new Set<string>();
	const ordered: PhotoPost[] = [];
	for (const uri of uris) {
		if (seen.has(uri)) continue;
		seen.add(uri);
		const post = byUri.get(uri);
		if (post) ordered.push(post);
	}
	return ordered;
}

/**
 * Full-text / hashtag post search via app.bsky.feed.searchPosts. Requires an
 * authenticated agent (the public appview rejects unauthenticated searches).
 * Returns only posts that carry image embeds.
 */
export async function searchPhotoPosts(
	agent: BskyAgent,
	query: string,
	cursor?: string,
	limit: number = 50
): Promise<{ posts: PhotoPost[]; cursor?: string }> {
	const res = await agent.app.bsky.feed.searchPosts({ q: query, limit, cursor });
	const isAuthenticated = !!agent.session;
	const posts: PhotoPost[] = [];
	for (const post of res.data.posts) {
		const mapped = postViewToPhotoPost(post, false, isAuthenticated);
		if (mapped) posts.push(mapped);
	}
	return { posts, cursor: res.data.cursor };
}

export async function getFollows(
	agent: BskyAgent,
	handle: string,
	cursor?: string,
	limit: number = 50
): Promise<{ follows: ProfileInfo[]; cursor?: string }> {
	const res = await agent.getFollows({ actor: handle, limit, cursor });
	return {
		follows: res.data.follows.map((f) => ({
			did: f.did,
			handle: f.handle,
			displayName: f.displayName,
			avatar: f.avatar,
			description: f.description
		})),
		cursor: res.data.cursor
	};
}
