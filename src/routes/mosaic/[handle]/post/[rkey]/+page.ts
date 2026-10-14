import { error } from '@sveltejs/kit';
import { createAgent, hidesFromLoggedOut, postViewToPhotoPost } from '$lib/api/bluesky.js';
import { getAuthenticatedAgent } from '$lib/stores/auth.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const handle = decodeURIComponent(params.handle);
	const rkey = params.rkey;
	// Same agent choice as the mosaic page: the viewer's session when signed in.
	const agent = getAuthenticatedAgent() || createAgent();

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
	// Checked here as well as in postViewToPhotoPost so the page can tell this
	// case apart from a post with no images, and so a viewer who logs out
	// stops seeing a post that was loaded while they were signed in.
	const requiresAuth = hidesFromLoggedOut(profileRes.data.labels) || hidesFromLoggedOut(p.author?.labels);
	const isAuthenticated = !!agent.session;
	// The account this load fetched as, so the page can reload after an
	// account switch.
	const viewer: string | null = agent.session?.did ?? null;
	// The resolved handle, so a DID in the URL still reads as a handle. Bluesky
	// reports unverified handles as handle.invalid, which doesn't route, so
	// keep the URL's value then.
	const authorHandle = profileRes.data.handle === 'handle.invalid' ? handle : profileRes.data.handle;
	if (requiresAuth && !isAuthenticated) {
		return { post: null, requiresAuth, handle: authorHandle, viewer };
	}

	const post = postViewToPhotoPost(p, false, isAuthenticated);
	if (!post) {
		throw error(404, 'Post has no images');
	}

	return { post, requiresAuth, handle: authorHandle, viewer };
};
