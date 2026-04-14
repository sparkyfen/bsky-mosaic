import type { Handle } from '@sveltejs/kit';
import { isCrawler } from '$lib/server/crawlers.js';
import { buildPostEmbed, buildProfileEmbed } from '$lib/server/embed.js';

const MOSAIC_RE = /^\/mosaic\/([^/]+)\/?$/;
const POST_RE = /^\/mosaic\/([^/]+)\/post\/([^/]+)\/?$/;

function htmlResponse(body: string): Response {
	return new Response(body, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	const ua = event.request.headers.get('user-agent');
	if (!isCrawler(ua)) return resolve(event);

	const { pathname, href } = event.url;

	try {
		const postMatch = pathname.match(POST_RE);
		if (postMatch) {
			const bskyHandle = decodeURIComponent(postMatch[1]);
			const rkey = decodeURIComponent(postMatch[2]);
			return htmlResponse(await buildPostEmbed(bskyHandle, rkey, href));
		}

		const mosaicMatch = pathname.match(MOSAIC_RE);
		if (mosaicMatch) {
			const bskyHandle = decodeURIComponent(mosaicMatch[1]);
			return htmlResponse(await buildProfileEmbed(bskyHandle, href));
		}
	} catch {
		// Fall through to the real app on any fetch failure — the layout's
		// static OG tags will still give the crawler something to render.
	}

	// Non-embeddable routes (/, /profile, legal pages, etc.) — let SvelteKit
	// render normally so the layout's existing <meta> tags are served.
	return resolve(event);
};
