import { error } from '@sveltejs/kit';
import { createAgent, type PhotoImage, type PhotoPost } from '$lib/api/bluesky.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const handle = decodeURIComponent(params.handle);
	const rkey = params.rkey;
	const agent = createAgent();

	let profileRes;
	try {
		profileRes = await agent.getProfile({ actor: handle });
	} catch {
		throw error(404, `Profile not found: ${handle}`);
	}

	const uri = `at://${profileRes.data.did}/app.bsky.feed.post/${rkey}`;

	let threadRes;
	try {
		threadRes = await agent.getPostThread({ uri, depth: 0 });
	} catch {
		throw error(404, 'Post not found');
	}

	const thread = threadRes.data.thread as any;
	if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
		throw error(404, 'Post not found');
	}

	const p = thread.post;
	const embed = p.embed;
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

	if (images.length === 0) {
		throw error(404, 'Post has no images');
	}

	const post: PhotoPost = {
		uri: p.uri,
		cid: p.cid,
		author: {
			did: p.author.did,
			handle: p.author.handle,
			displayName: p.author.displayName,
			avatar: p.author.avatar
		},
		images,
		indexedAt: p.indexedAt,
		parentChain: [],
		isRepost: false,
		labels: (p.labels || []).map((l: any) => l.val).filter(Boolean),
		nsfw: false
	};

	return { post, handle };
};
