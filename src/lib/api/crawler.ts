import type { BskyAgent } from '@atproto/api';
import type { ProfileInfo, PhotoPost } from './bluesky.js';
import { getPhotoPosts } from './bluesky.js';

export interface CrawlOptions {
	maxDepth: number;
	accountsPerLevel: number;
	postsPerAccount: number;
	concurrency: number;
}

export interface CrawlProgress {
	type: 'progress';
	depth: number;
	accountsFound: number;
	currentHandle: string;
	photosFound: number;
}

export interface CrawlResult {
	type: 'photos';
	posts: PhotoPost[];
}

export interface CrawlComplete {
	type: 'complete';
	totalAccounts: number;
	totalPhotos: number;
}

export interface CrawlError {
	type: 'error';
	message: string;
}

export type CrawlEvent = CrawlProgress | CrawlResult | CrawlComplete | CrawlError;

const DEFAULT_OPTIONS: CrawlOptions = {
	maxDepth: 1,
	accountsPerLevel: 50,
	postsPerAccount: 50,
	concurrency: 5
};

async function processWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const results: R[] = [];
	const executing: Set<Promise<void>> = new Set();

	for (const item of items) {
		const p = fn(item).then((result) => {
			results.push(result);
		});
		const wrapped = p.then(() => {
			executing.delete(wrapped);
		});
		executing.add(wrapped);

		if (executing.size >= concurrency) {
			await Promise.race(executing);
		}
	}

	await Promise.all(executing);
	return results;
}

export async function* crawlReposts(
	agent: BskyAgent,
	startHandle: string,
	options: Partial<CrawlOptions> = {}
): AsyncGenerator<CrawlEvent> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const visited = new Set<string>();
	let totalPhotos = 0;

	// Depth 0: starting account
	visited.add(startHandle);

	let currentLevel: { handle: string; profile?: ProfileInfo; parentChain: ProfileInfo[] }[] = [
		{ handle: startHandle, parentChain: [] }
	];

	for (let depth = 0; depth <= opts.maxDepth; depth++) {
		const nextLevel: { handle: string; profile?: ProfileInfo; parentChain: ProfileInfo[] }[] = [];

		// Skip fetching photos for depth 0 (starting account) — already loaded by the page
		if (depth > 0) {
			for (let i = 0; i < currentLevel.length; i += opts.concurrency) {
				const batch = currentLevel.slice(i, i + opts.concurrency);
				const batchResults = await Promise.all(
					batch.map(async (account) => {
						try {
							const { posts } = await getPhotoPosts(agent, account.handle, undefined, Math.min(opts.postsPerAccount, 100));
							for (const post of posts) {
								post.parentChain = account.parentChain;
								post.isRepost = true;
							}
							return { posts, handle: account.handle, parentChain: account.parentChain };
						} catch {
							return { posts: [] as PhotoPost[], handle: account.handle, parentChain: account.parentChain };
						}
					})
				);

				for (const result of batchResults) {
					if (result.posts.length > 0) {
						totalPhotos += result.posts.length;

						yield {
							type: 'photos',
							posts: result.posts
						} satisfies CrawlResult;

						yield {
							type: 'progress',
							depth,
							accountsFound: visited.size,
							currentHandle: result.handle,
							photosFound: totalPhotos
						} satisfies CrawlProgress;
					}
				}
			}
		}

		// Discover reposts for next level
		if (depth < opts.maxDepth) {
			const isAuthenticated = !!agent.session;

			for (const account of currentLevel) {
				try {
					const res = await agent.getAuthorFeed({
						actor: account.handle,
						limit: 100
					});

					// Build profile for the current (reposting) account from feed data
					// or use stored profile if available
					let currentProfile = account.profile;
					if (!currentProfile && res.data.feed.length > 0) {
						// For depth 0, get profile from any post authored by this account
						// For deeper levels, use the stored profile
						for (const item of res.data.feed) {
							if (item.post.author.handle === account.handle) {
								currentProfile = {
									did: item.post.author.did,
									handle: item.post.author.handle,
									displayName: item.post.author.displayName,
									avatar: item.post.author.avatar
								};
								break;
							}
						}
					}

					for (const item of res.data.feed) {
						// Skip authors who require authentication when not logged in
					const authorRequiresAuth = !isAuthenticated &&
						Array.isArray(item.post.author.labels) &&
						item.post.author.labels.some((l: any) => l.val === '!no-unauthenticated');

					if (
							item.reason?.$type === 'app.bsky.feed.defs#reasonRepost' &&
							!visited.has(item.post.author.handle) &&
							!authorRequiresAuth
						) {
							visited.add(item.post.author.handle);

							// Parent chain = path TO this account: previous chain + the account that reposted
							const chain = currentProfile
								? [...account.parentChain, currentProfile]
								: account.parentChain;

							nextLevel.push({
								handle: item.post.author.handle,
								profile: {
									did: item.post.author.did,
									handle: item.post.author.handle,
									displayName: item.post.author.displayName,
									avatar: item.post.author.avatar
								},
								parentChain: chain
							});

							if (nextLevel.length >= opts.accountsPerLevel) break;
						}
					}
				} catch {
					// Skip on error
				}

				if (nextLevel.length >= opts.accountsPerLevel) break;
			}
		}

		currentLevel = nextLevel;
		if (currentLevel.length === 0 && depth < opts.maxDepth) break;
	}

	yield {
		type: 'complete',
		totalAccounts: visited.size,
		totalPhotos
	} satisfies CrawlComplete;
}
