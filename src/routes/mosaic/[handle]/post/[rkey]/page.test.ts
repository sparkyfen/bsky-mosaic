import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	appview,
	AVATAR,
	FakeAgent,
	IMAGE,
	NAME,
	OPT_OUT,
	profileView,
	threadView
} from '$lib/test/bsky.js';

const session = vi.hoisted(() => ({ agent: null as unknown }));

vi.mock('@atproto/api', async () => ({ BskyAgent: (await import('$lib/test/bsky.js')).FakeAgent }));
vi.mock('$lib/stores/auth.js', () => ({ getAuthenticatedAgent: () => session.agent }));

const { load } = await import('./+page.js');

const run = (handle = 'artist.example') =>
	load({ params: { handle, rkey: '3exampleabc12' } } as any) as Promise<any>;

describe('direct post page load', () => {
	beforeEach(() => {
		session.agent = null;
		appview.profile = profileView();
		appview.thread = threadView();
	});

	it('loads a plain post for a logged-out viewer', async () => {
		const data = await run();
		expect(data.post.images[0].fullsize).toBe(IMAGE);
		expect(data.post.nsfw).toBe(false);
		expect(data.viewer).toBeNull();
	});

	it("withholds an opted-out author's post from a logged-out viewer", async () => {
		appview.thread = threadView({ authorLabels: [OPT_OUT] });
		const data = await run();
		expect(data.post).toBeNull();
		expect(data.viewer).toBeNull();
		const serialized = JSON.stringify(data);
		for (const leak of [NAME, AVATAR, IMAGE]) expect(serialized).not.toContain(leak);
	});

	it('withholds the post when only the author profile carries the opt-out label', async () => {
		appview.profile = profileView([OPT_OUT]);
		const data = await run();
		expect(data.post).toBeNull();
		expect(JSON.stringify(data)).not.toContain(IMAGE);
	});

	it("loads an opted-out author's post for a logged-in viewer", async () => {
		session.agent = new FakeAgent(undefined, { did: 'did:plc:viewer' });
		appview.thread = threadView({ authorLabels: [OPT_OUT] });
		const data = await run();
		expect(data.post.images[0].fullsize).toBe(IMAGE);
		expect(data.viewer).toBe('did:plc:viewer');
		// So the page hides it again if the viewer logs out.
		expect(data.requiresAuth).toBe(true);
	});

	it("loads the post for a logged-in viewer when only the author profile carries the opt-out label", async () => {
		session.agent = new FakeAgent(undefined, { did: 'did:plc:viewer' });
		appview.profile = profileView([OPT_OUT]);
		const data = await run();
		expect(data.post.images[0].fullsize).toBe(IMAGE);
		expect(data.requiresAuth).toBe(true);
	});

	it('loads the post when neither the profile nor the post author has a labels field', async () => {
		appview.profile = profileView(null);
		appview.thread = threadView({ authorLabels: null });
		const data = await run();
		expect(data.post.images[0].fullsize).toBe(IMAGE);
		expect(data.requiresAuth).toBe(false);
	});

	it('returns the resolved handle when the URL names the author by DID', async () => {
		const data = await run('did:plc:example');
		expect(data.handle).toBe('artist.example');
	});

	it("returns the resolved handle for a logged-out viewer of an opted-out author named by DID", async () => {
		appview.profile = profileView([OPT_OUT]);
		const data = await run('did:plc:example');
		expect(data.post).toBeNull();
		expect(data.handle).toBe('artist.example');
	});

	it('keeps the URL handle when Bluesky reports the handle as invalid', async () => {
		appview.profile = { ...profileView(), handle: 'handle.invalid' };
		const data = await run('did:plc:example');
		expect(data.handle).toBe('did:plc:example');
	});

	it('marks an adult-labeled post as nsfw', async () => {
		appview.thread = threadView({ postLabels: [{ ...OPT_OUT, val: 'porn' }] });
		const data = await run();
		expect(data.post.nsfw).toBe(true);
	});

	it('still returns 404 for a post with no images', async () => {
		appview.thread = threadView({ images: false });
		await expect(run()).rejects.toMatchObject({ status: 404 });
	});
});
