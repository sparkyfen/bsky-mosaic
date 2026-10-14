// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';
import type { PhotoPost } from '$lib/api/bluesky.js';
import type { AuthState } from '$lib/stores/auth.js';
import type { AppSettings } from '$lib/stores/settings.js';
import { appview, FakeAgent, LOGGED_OUT, OPT_OUT, profileView, threadView } from '$lib/test/bsky.js';

const stores = vi.hoisted(() => ({}) as {
	authState: import('svelte/store').Writable<AuthState>;
	settings: import('svelte/store').Writable<Partial<AppSettings>>;
});
const nav = vi.hoisted(() => ({ goto: vi.fn(), invalidateAll: vi.fn(async () => {}) }));
const session = vi.hoisted(() => ({ agent: null as unknown }));

vi.mock('$app/navigation', () => nav);
vi.mock('@atproto/api', async () => ({ BskyAgent: (await import('$lib/test/bsky.js')).FakeAgent }));
vi.mock('$lib/api/entail.js', () => ({ getPostTags: vi.fn(() => new Promise(() => {})) }));
vi.mock('$lib/stores/auth.js', async () => {
	const { get, writable } = await import('svelte/store');
	const { FakeAgent } = await import('$lib/test/bsky.js');
	const inner = writable<AuthState>();
	// Like the real store: each account that signs in brings its own agent,
	// in place before the state changes, and signing out drops it. To model
	// signing in again as the same account, set session.agent first.
	const set = (next: AuthState) => {
		if (next.did !== get(inner)?.did) session.agent = next.did ? new FakeAgent(undefined, { did: next.did }) : null;
		inner.set(next);
	};
	stores.authState = { subscribe: inner.subscribe, set, update: (fn) => set(fn(get(inner))) };
	return {
		authState: stores.authState,
		getAuthenticatedAgent: () => session.agent,
		followUser: vi.fn(),
		unfollowUser: vi.fn(),
		getFollowStatus: vi.fn(async () => null),
		likePost: vi.fn(),
		unlikePost: vi.fn(),
		getLikeStatus: vi.fn(async () => null)
	};
});
vi.mock('$lib/stores/settings.js', async () => {
	const { writable } = await import('svelte/store');
	stores.settings = writable<Partial<AppSettings>>();
	return { settings: stores.settings };
});

const { sessionReady, showLoginModal } = await import('$lib/stores/ui.js');
const { default: Page } = await import('./+page.svelte');
const { load } = await import('./+page.js');

const ADULT_VIEWER: AuthState = {
	...LOGGED_OUT,
	isAuthenticated: true,
	handle: 'viewer.example',
	did: 'did:plc:viewer',
	adultContentEnabled: true,
	ageVerified: true
};

function photoPost(overrides: Partial<PhotoPost> = {}): PhotoPost {
	return {
		uri: 'at://did:plc:example/app.bsky.feed.post/3exampleabc12',
		cid: 'bafyreiexamplepost',
		author: { did: 'did:plc:example', handle: 'artist.example', displayName: 'Example Artist' },
		images: [{ cid: 'bafkreiexampleimage', thumb: 'thumb.jpg', fullsize: 'full.jpg', alt: '' }],
		indexedAt: '2026-01-01T00:00:00.000Z',
		parentChain: [],
		isRepost: false,
		labels: [],
		nsfw: false,
		...overrides
	};
}

const NSFW = photoPost({ labels: ['porn'], nsfw: true });

const NSFW_B = photoPost({
	uri: 'at://did:plc:example/app.bsky.feed.post/3exampleabc34',
	images: [{ cid: 'bafkreiexampleimageb', thumb: 'thumb-b.jpg', fullsize: 'full-b.jpg', alt: '' }],
	labels: ['porn'],
	nsfw: true
});

function pageData(
	post: PhotoPost | null,
	{ requiresAuth = false, viewer = null as string | null, handle = 'artist.example' } = {}
) {
	return { data: { post, requiresAuth, handle, viewer } } as any;
}

function show(post: PhotoPost | null, opts: { requiresAuth?: boolean; viewer?: string | null; handle?: string } = {}) {
	return render(Page, pageData(post, opts));
}

const flush = () => new Promise((r) => setTimeout(r));

function imagesShown(container: HTMLElement) {
	return container.querySelectorAll('img').length;
}

describe('direct post page', () => {
	beforeEach(() => {
		nav.invalidateAll.mockClear();
		nav.goto.mockClear();
		session.agent = null;
		showLoginModal.set(false);
		stores.authState.set(LOGGED_OUT);
		stores.settings.set({ nsfwMode: 'hide' });
		sessionReady.set(true);
	});

	it('shows a plain post to a logged-out viewer', () => {
		const { container } = show(photoPost());
		expect(screen.getByRole('dialog')).toBeTruthy();
		expect(imagesShown(container)).toBeGreaterThan(0);
	});

	it('shows a plain post without waiting for the session to restore', () => {
		sessionReady.set(false);
		show(photoPost());
		expect(screen.getByRole('dialog')).toBeTruthy();
	});

	it('hides an adult post from a logged-out viewer, even with a stale show setting', () => {
		stores.settings.set({ nsfwMode: 'show' });
		const { container } = show(NSFW);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
		expect(
			screen.getByText('This post has adult content. To see it, sign in and change your content settings.')
		).toBeTruthy();
	});

	it('goes back to the mosaic when the viewer closes the post', async () => {
		show(photoPost());
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(nav.goto).toHaveBeenCalledWith('/mosaic/artist.example');
	});

	it('offers a signed-out viewer of an adult post a way to sign in and to go back', async () => {
		show(NSFW);
		await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
		expect(get(showLoginModal)).toBe(true);
		expect(screen.getByRole('link', { name: 'Back to @artist.example' }).getAttribute('href')).toBe(
			'/mosaic/artist.example'
		);
	});

	it('hides an adult post when the viewer chose to hide adult content', () => {
		stores.authState.set(ADULT_VIEWER);
		const { container } = show(NSFW);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
		expect(screen.getByText('This post has adult content, and your content settings hide it.')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Change content settings' }).getAttribute('href')).toBe('/settings');
		expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
	});

	it('hides an adult post when the Bluesky account has adult content off', () => {
		stores.authState.set({ ...ADULT_VIEWER, adultContentEnabled: false });
		stores.settings.set({ nsfwMode: 'show' });
		const { container } = show(NSFW);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
		expect(
			screen.getByText('This post has adult content, and your Bluesky account settings hide it.')
		).toBeTruthy();
		expect(screen.queryByRole('link', { name: 'Change content settings' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
	});

	it('does not show an adult post before the session restores', () => {
		sessionReady.set(false);
		stores.authState.set(ADULT_VIEWER);
		stores.settings.set({ nsfwMode: 'show' });
		const { container } = show(NSFW);
		expect(imagesShown(container)).toBe(0);
	});

	it('asks before showing an adult post in blur mode', async () => {
		stores.authState.set(ADULT_VIEWER);
		stores.settings.set({ nsfwMode: 'blur' });
		const { container } = show(NSFW);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
		expect(screen.getByRole('status').textContent).toContain('Sensitive content');
		expect(screen.getByRole('link', { name: 'Back to @artist.example' }).getAttribute('href')).toBe(
			'/mosaic/artist.example'
		);
		await fireEvent.click(screen.getByRole('button', { name: /show content/i }));
		expect(screen.getByRole('dialog')).toBeTruthy();
		expect(imagesShown(container)).toBeGreaterThan(0);
	});

	it('gates a revealed adult post again when another account signs in', async () => {
		stores.authState.set(ADULT_VIEWER);
		stores.settings.set({ nsfwMode: 'blur' });
		const { container } = show(NSFW);
		await fireEvent.click(screen.getByRole('button', { name: /show content/i }));
		expect(screen.getByRole('dialog')).toBeTruthy();
		stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b' });
		await flush();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
		expect(screen.getByRole('button', { name: /show content/i })).toBeTruthy();
	});

	it('gates the next adult post again after the viewer revealed one', async () => {
		stores.authState.set(ADULT_VIEWER);
		stores.settings.set({ nsfwMode: 'blur' });
		const { container, rerender } = show(NSFW);
		await fireEvent.click(screen.getByRole('button', { name: /show content/i }));
		expect(screen.getByRole('dialog')).toBeTruthy();

		// Record every image that appears or changes source while the page
		// swaps to post B, so a single-frame flash still counts.
		const flashed: string[] = [];
		const observer = new MutationObserver((records) => {
			for (const r of records) {
				if (r.type === 'attributes' && (r.target as Element).tagName === 'IMG') {
					flashed.push((r.target as HTMLImageElement).getAttribute('src') ?? '');
				}
				for (const node of r.addedNodes) {
					if (!(node instanceof Element)) continue;
					const imgs = node.tagName === 'IMG' ? [node] : [...node.querySelectorAll('img')];
					for (const img of imgs) flashed.push(img.getAttribute('src') ?? '');
				}
			}
		});
		observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
		await rerender(pageData(NSFW_B));
		await flush();
		observer.disconnect();

		expect(flashed).toEqual([]);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('button', { name: /show content/i })).toBeTruthy();
		expect(imagesShown(container)).toBe(0);
	});

	it('shows an adult post to an adult viewer who chose to show it', () => {
		stores.authState.set(ADULT_VIEWER);
		stores.settings.set({ nsfwMode: 'show' });
		const { container } = show(NSFW);
		expect(screen.getByRole('dialog')).toBeTruthy();
		// The reserved notice behind the modal stays empty, so nothing in it is
		// focusable or announced.
		const focusable = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
		expect(container.querySelector('.notice')!.querySelectorAll(focusable)).toHaveLength(0);
		expect(screen.getAllByRole('status')[0].textContent?.trim()).toBe('');
	});

	it("hides an opted-out author's post after the viewer logs out", async () => {
		stores.authState.set(ADULT_VIEWER);
		const { container } = show(photoPost(), { requiresAuth: true, viewer: ADULT_VIEWER.did });
		expect(screen.getByRole('dialog')).toBeTruthy();
		// The page's own live region comes first; the modal has one of its own.
		const region = screen.getAllByRole('status')[0];
		stores.authState.set(LOGGED_OUT);
		await Promise.resolve();
		await flush();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
		// Announced through the same live region that was already on the page.
		expect(region.isConnected).toBe(true);
		expect(region.textContent).toMatch(/signed in\. Sign in to\s+see this post\./);
		// Only the message is announced, not the controls next to it.
		expect(region.textContent).not.toContain('Back to');
		expect(screen.getByRole('link', { name: 'Back to @artist.example' }).getAttribute('href')).toBe(
			'/mosaic/artist.example'
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
		expect(get(showLoginModal)).toBe(true);
	});

	it("hides a post that load() fetched for a signed-in viewer of an opted-out author once they log out", async () => {
		session.agent = new FakeAgent(undefined, { did: ADULT_VIEWER.did });
		appview.profile = profileView();
		appview.thread = threadView({ authorLabels: [OPT_OUT] });
		const data = await load({ params: { handle: 'artist.example', rkey: '3exampleabc12' } } as any);
		stores.authState.set(ADULT_VIEWER);
		const { container } = render(Page, { data } as any);
		expect(screen.getByRole('dialog')).toBeTruthy();
		stores.authState.set(LOGGED_OUT);
		await flush();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
	});

	it("does not tell a viewer whose session is still restoring that an opted-out post needs sign-in", () => {
		sessionReady.set(false);
		show(null, { requiresAuth: true });
		expect(screen.queryByText(/signed in/i)).toBeNull();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		expect(screen.queryByRole('link', { name: /Back to/ })).toBeNull();
	});

	it('shows Loading while a signed-in viewer waits on the reload', async () => {
		nav.invalidateAll.mockImplementationOnce(() => new Promise<void>(() => {}));
		stores.authState.set(ADULT_VIEWER);
		show(null, { requiresAuth: true });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
		expect(screen.queryByRole('link', { name: /Back to/ })).toBeNull();
	});

	it("tells a signed-out viewer that an opted-out author's post needs sign-in", async () => {
		show(null, { requiresAuth: true });
		await flush();
		expect(screen.getByRole('status').textContent).toMatch(/visible only to people who are signed in/);
		expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
		expect(nav.invalidateAll).not.toHaveBeenCalled();
	});

	it('offers sign-in again when the reload for a signed-in viewer still comes back empty', async () => {
		let settle!: () => void;
		nav.invalidateAll.mockImplementationOnce(() => new Promise<void>((resolve) => (settle = resolve)));
		stores.authState.set(ADULT_VIEWER);
		const { rerender } = show(null, { requiresAuth: true });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
		// SvelteKit hands the page its new data before invalidateAll() resolves.
		await rerender(pageData(null, { requiresAuth: true }));
		await flush();
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		settle();
		await flush();
		expect(screen.getByRole('status').textContent).toMatch(
			/signed in\. Your sign-in may have expired\. Sign in again to see this post\./
		);
		expect(screen.getByRole('button', { name: 'Sign in again' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Back to @artist.example' }).getAttribute('href')).toBe(
			'/mosaic/artist.example'
		);
	});

	it('offers sign-in again when the reload itself fails', async () => {
		nav.invalidateAll.mockImplementationOnce(() => Promise.reject(new Error('reload failed')));
		stores.authState.set(ADULT_VIEWER);
		show(null, { requiresAuth: true });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('button', { name: 'Sign in again' })).toBeTruthy();
	});

	it("shows an opted-out author's post once the reload for a signed-in viewer brings it back", async () => {
		stores.authState.set(ADULT_VIEWER);
		const { rerender } = show(null, { requiresAuth: true });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
		await rerender(pageData(photoPost(), { requiresAuth: true, viewer: ADULT_VIEWER.did }));
		await flush();
		expect(screen.getByRole('dialog')).toBeTruthy();
		// The page's own live region comes first; the modal has one of its own.
		expect(screen.getAllByRole('status')[0].textContent).not.toMatch(/signed in/);
	});

	it('reloads again when the viewer signs out and back in after an empty reload', async () => {
		stores.authState.set(ADULT_VIEWER);
		const { rerender } = show(null, { requiresAuth: true });
		await flush();
		await rerender(pageData(null, { requiresAuth: true }));
		await flush();
		expect(screen.getByRole('button', { name: 'Sign in again' })).toBeTruthy();
		stores.authState.set(LOGGED_OUT);
		await flush();
		expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
		nav.invalidateAll.mockImplementationOnce(() => new Promise<void>(() => {}));
		// Signing back in brings a new agent for the same account.
		stores.authState.set(ADULT_VIEWER);
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(2);
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
	});

	it('reloads again when the viewer signs in again as the same account after an empty reload', async () => {
		stores.authState.set(ADULT_VIEWER);
		const { rerender } = show(null, { requiresAuth: true });
		await flush();
		await rerender(pageData(null, { requiresAuth: true }));
		await flush();
		expect(screen.getByRole('button', { name: 'Sign in again' })).toBeTruthy();
		nav.invalidateAll.mockImplementationOnce(() => new Promise<void>(() => {}));
		// login() over the stale session: same account, new agent, no sign-out.
		session.agent = new FakeAgent(undefined, { did: ADULT_VIEWER.did });
		stores.authState.set({ ...ADULT_VIEWER });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(2);
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
	});

	it("keeps Loading for the new account when the previous account's reload settles", async () => {
		let settleA!: () => void;
		nav.invalidateAll
			.mockImplementationOnce(() => new Promise<void>((resolve) => (settleA = resolve)))
			.mockImplementationOnce(() => new Promise<void>(() => {}));
		stores.authState.set(ADULT_VIEWER);
		show(null, { requiresAuth: true });
		await flush();
		stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b' });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(2);
		settleA();
		await flush();
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		expect(screen.queryByRole('button', { name: 'Sign in again' })).toBeNull();
	});

	it("never flashes sign-in again when the previous account's reload settles just as another account signs in", async () => {
		let settleA!: () => void;
		nav.invalidateAll
			.mockImplementationOnce(() => new Promise<void>((resolve) => (settleA = resolve)))
			.mockImplementationOnce(() => new Promise<void>(() => {}));
		stores.authState.set(ADULT_VIEWER);
		const { container } = show(null, { requiresAuth: true });
		await flush();

		// Record every bit of text the page renders, so a single-frame flash
		// still counts.
		const seen: string[] = [];
		const observer = new MutationObserver((records) => {
			for (const r of records) {
				if (r.type === 'characterData') seen.push(r.target.textContent ?? '');
				for (const node of r.addedNodes) seen.push(node.textContent ?? '');
			}
		});
		observer.observe(container, { childList: true, characterData: true, subtree: true });
		// A's reload settles in a microtask after B signs in but before the page
		// reacts to B.
		settleA();
		queueMicrotask(() => stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b' }));
		await flush();
		observer.disconnect();

		expect(seen.filter((text) => /Sign in again|may have expired/.test(text))).toEqual([]);
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		expect(nav.invalidateAll).toHaveBeenCalledTimes(2);
	});

	it("keeps Loading when switching back to an account whose superseded reload settled", async () => {
		let settleA!: () => void;
		nav.invalidateAll
			.mockImplementationOnce(() => new Promise<void>((resolve) => (settleA = resolve)))
			.mockImplementationOnce(() => new Promise<void>(() => {}))
			.mockImplementationOnce(() => new Promise<void>(() => {}));
		stores.authState.set(ADULT_VIEWER);
		show(null, { requiresAuth: true });
		await flush();
		const agentA = session.agent;
		stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b' });
		await flush();
		// SvelteKit settles a superseded invalidateAll() early, with no new data.
		settleA();
		await flush();
		// Switching back reuses A's cached agent, as switchAccount/resumeAgent do.
		// The mock store makes a new agent on a DID change, so restore A's in the
		// same tick, before the page reacts.
		stores.authState.set(ADULT_VIEWER);
		session.agent = agentA;
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(3);
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		expect(screen.queryByRole('button', { name: 'Sign in again' })).toBeNull();
	});

	it("keeps Loading when an account's superseded reload settles after switching back to it", async () => {
		let settleA!: () => void;
		nav.invalidateAll
			.mockImplementationOnce(() => new Promise<void>((resolve) => (settleA = resolve)))
			.mockImplementationOnce(() => new Promise<void>(() => {}))
			.mockImplementationOnce(() => new Promise<void>(() => {}));
		stores.authState.set(ADULT_VIEWER);
		show(null, { requiresAuth: true });
		await flush();
		const agentA = session.agent;
		stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b' });
		await flush();
		stores.authState.set(ADULT_VIEWER);
		session.agent = agentA;
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(3);
		// A's first reload, long superseded, settles while its newest one runs.
		settleA();
		await flush();
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		expect(screen.queryByRole('button', { name: 'Sign in again' })).toBeNull();
	});

	it("keeps Loading when switching back to an account whose earlier reload failed", async () => {
		nav.invalidateAll
			.mockImplementationOnce(() => Promise.reject(new Error('reload failed')))
			.mockImplementationOnce(() => new Promise<void>(() => {}))
			.mockImplementationOnce(() => new Promise<void>(() => {}));
		stores.authState.set(ADULT_VIEWER);
		show(null, { requiresAuth: true });
		await flush();
		expect(screen.getByRole('button', { name: 'Sign in again' })).toBeTruthy();
		const agentA = session.agent;
		stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b' });
		await flush();
		// Back to A with its cached agent, restored before the page reacts.
		stores.authState.set(ADULT_VIEWER);
		session.agent = agentA;
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(3);
		expect(screen.getByRole('status').textContent?.trim()).toBe('Loading…');
		expect(screen.queryByRole('button', { name: 'Sign in again' })).toBeNull();
	});

	it("does not reload an opted-out author's post when the viewer signs out", async () => {
		stores.authState.set(ADULT_VIEWER);
		const { rerender } = show(null, { requiresAuth: true });
		await flush();
		await rerender(pageData(photoPost(), { requiresAuth: true, viewer: ADULT_VIEWER.did }));
		stores.authState.set(LOGGED_OUT);
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
	});

	it("tells a signed-out viewer that an opted-out author's adult post needs sign-in", () => {
		show(NSFW, { requiresAuth: true });
		expect(screen.getByRole('status').textContent).toMatch(/visible only to people who are signed in/);
	});

	it('labels the back link plainly when the author has no valid handle', () => {
		show(null, { requiresAuth: true, handle: 'did:plc:example' });
		expect(screen.getByRole('link', { name: 'Back to profile' }).getAttribute('href')).toBe(
			'/mosaic/did%3Aplc%3Aexample'
		);
		expect(screen.queryByRole('link', { name: /@did:/ })).toBeNull();
	});

	it('does not reload a post that any viewer can see', async () => {
		stores.authState.set(ADULT_VIEWER);
		show(photoPost(), { requiresAuth: false, viewer: null });
		await flush();
		expect(nav.invalidateAll).not.toHaveBeenCalled();
	});

	it("does not show an opted-out author's post before the session restores", () => {
		sessionReady.set(false);
		const { container } = show(photoPost(), { requiresAuth: true });
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(imagesShown(container)).toBe(0);
	});

	it("reloads an opted-out author's post when the viewer switches accounts", async () => {
		stores.authState.set(ADULT_VIEWER);
		show(photoPost(), { requiresAuth: true, viewer: ADULT_VIEWER.did });
		await flush();
		expect(nav.invalidateAll).not.toHaveBeenCalled();
		stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b' });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
		stores.authState.set({ ...ADULT_VIEWER, handle: 'other.example', did: 'did:plc:viewer-b', avatar: 'a.jpg' });
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
	});

	it("reloads an opted-out author's post once a signed-in session is ready, and only once", async () => {
		sessionReady.set(false);
		const { rerender } = show(null, { requiresAuth: true });
		expect(nav.invalidateAll).not.toHaveBeenCalled();
		stores.authState.set(ADULT_VIEWER);
		sessionReady.set(true);
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
		// A reload that still comes back empty must not start a refetch loop.
		await rerender(pageData(null, { requiresAuth: true }));
		await flush();
		expect(nav.invalidateAll).toHaveBeenCalledTimes(1);
	});
});
