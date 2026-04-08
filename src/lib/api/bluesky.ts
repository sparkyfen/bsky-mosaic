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
}

export type ContentLabel = 'sexual' | 'nudity' | 'porn' | 'graphic-media' | 'gore';

const NSFW_LABELS = new Set<string>(['sexual', 'nudity', 'porn', 'graphic-media', 'gore']);

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
	thumb: string;
	fullsize: string;
	alt: string;
	aspectRatio?: { width: number; height: number };
}

export async function getProfile(agent: BskyAgent, handle: string): Promise<ProfileInfo> {
	const res = await agent.getProfile({ actor: handle });
	return {
		did: res.data.did,
		handle: res.data.handle,
		displayName: res.data.displayName,
		avatar: res.data.avatar,
		description: res.data.description,
		postsCount: res.data.postsCount,
		followsCount: res.data.followsCount,
		followersCount: res.data.followersCount
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

	const posts: PhotoPost[] = [];

	for (const item of res.data.feed) {
		const post = item.post;
		const embed = post.embed;
		const isRepost = item.reason?.$type === 'app.bsky.feed.defs#reasonRepost';

		// Extract content labels
		const labels: string[] = [];
		if (post.labels && Array.isArray(post.labels)) {
			for (const label of post.labels) {
				if (label.val) labels.push(label.val);
			}
		}

		const images: PhotoImage[] = [];

		if (embed?.$type === 'app.bsky.embed.images#view') {
			for (const img of (embed as any).images) {
				images.push({
					thumb: img.thumb,
					fullsize: img.fullsize,
					alt: img.alt || '',
					aspectRatio: img.aspectRatio
				});
			}
		} else if (embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
			const media = (embed as any).media;
			if (media?.$type === 'app.bsky.embed.images#view') {
				for (const img of media.images) {
					images.push({
						thumb: img.thumb,
						fullsize: img.fullsize,
						alt: img.alt || '',
						aspectRatio: img.aspectRatio
					});
				}
			}
		}

		if (images.length > 0) {
			posts.push({
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
			});
		}
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
