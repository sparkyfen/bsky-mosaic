import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	appview,
	AVATAR,
	BIO,
	IMAGE,
	NAME,
	OPT_OUT,
	profileView,
	TEXT,
	threadView
} from '$lib/test/bsky.js';

vi.mock('@atproto/api', async () => ({ BskyAgent: (await import('$lib/test/bsky.js')).FakeAgent }));

const { handle } = await import('./hooks.server.js');

// What the app itself serves: the layout's site-wide OG tags.
const GENERIC = '<html><head><meta property="og:title" content="BlueMosaic" /></head></html>';

async function crawl(path: string): Promise<string> {
	const url = new URL(`https://tiles.blue${path}`);
	const event = {
		url,
		request: new Request(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Discordbot/2.0)' } })
	};
	const res = await handle({ event, resolve: async () => new Response(GENERIC) } as any);
	return res.text();
}

function expectNothingIdentifying(body: string) {
	for (const leak of [NAME, BIO, AVATAR, TEXT, IMAGE, 'did:plc:example']) {
		expect(body).not.toContain(leak);
	}
}

describe('link previews for crawlers', () => {
	beforeEach(() => {
		appview.profile = profileView();
		appview.thread = threadView();
	});

	it('gives a profile that allows logged-out viewers a rich preview', async () => {
		const body = await crawl('/mosaic/artist.example');
		expect(body).toContain(NAME);
		expect(body).toContain(BIO);
		expect(body).toContain(AVATAR);
	});

	it('gives a post that allows logged-out viewers a rich preview', async () => {
		const body = await crawl('/mosaic/artist.example/post/3exampleabc12');
		expect(body).toContain(NAME);
		expect(body).toContain(TEXT);
		expect(body).toContain(IMAGE);
	});

	it('gives a post a rich preview when neither the profile nor the post author has a labels field', async () => {
		appview.profile = profileView(null);
		appview.thread = threadView({ authorLabels: null });
		const body = await crawl('/mosaic/artist.example/post/3exampleabc12');
		expect(body).toContain(NAME);
		expect(body).toContain(IMAGE);
	});

	it('keeps the rich preview for a profile with an unrelated self-label', async () => {
		appview.profile = profileView([{ ...OPT_OUT, val: 'porn' }]);
		expect(await crawl('/mosaic/artist.example')).toContain(NAME);
	});

	it('keeps the rich preview for a post whose author has an unrelated self-label', async () => {
		const porn = { ...OPT_OUT, val: 'porn' };
		appview.profile = profileView([porn]);
		appview.thread = threadView({ authorLabels: [porn] });
		const body = await crawl('/mosaic/artist.example/post/3exampleabc12');
		expect(body).toContain(NAME);
		expect(body).toContain(IMAGE);
	});

	it('serves the generic page for a profile hidden from logged-out viewers', async () => {
		appview.profile = profileView([OPT_OUT]);
		const body = await crawl('/mosaic/artist.example');
		expect(body).toBe(GENERIC);
		expectNothingIdentifying(body);
	});

	it('serves the generic page for a post whose author profile is hidden from logged-out viewers', async () => {
		appview.profile = profileView([OPT_OUT]);
		const body = await crawl('/mosaic/artist.example/post/3exampleabc12');
		expect(body).toBe(GENERIC);
		expectNothingIdentifying(body);
	});

	it('serves the generic page when only the post author view carries the opt-out label', async () => {
		appview.thread = threadView({ authorLabels: [OPT_OUT] });
		const body = await crawl('/mosaic/artist.example/post/3exampleabc12');
		expect(body).toBe(GENERIC);
		expectNothingIdentifying(body);
	});
});
