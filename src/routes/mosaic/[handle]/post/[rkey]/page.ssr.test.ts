// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { appview, AVATAR, IMAGE, NAME, OPT_OUT, profileView, TEXT, threadView } from '$lib/test/bsky.js';

// The svelteTesting plugin resolves 'svelte' to its browser build, whose
// onMount throws during a server render. Use the server build here.
// Vite resolves the leading slash from the project root.
// @ts-expect-error svelte ships no declaration file for its server entry
vi.mock('svelte', () => import('/node_modules/svelte/src/index-server.js'));
vi.mock('@atproto/api', async () => ({ BskyAgent: (await import('$lib/test/bsky.js')).FakeAgent }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));
vi.mock('$lib/api/entail.js', () => ({ getPostTags: vi.fn(() => new Promise(() => {})) }));
vi.mock('$lib/stores/auth.js', async () => {
	const { writable } = await import('svelte/store');
	const { LOGGED_OUT } = await import('$lib/test/bsky.js');
	return { getAuthenticatedAgent: () => null, authState: writable(LOGGED_OUT) };
});
vi.mock('$lib/stores/settings.js', async () => {
	const { writable } = await import('svelte/store');
	return { settings: writable({ nsfwMode: 'hide' }) };
});

const { load } = await import('./+page.js');
const { default: Page } = await import('./+page.svelte');
const { sessionReady } = await import('$lib/stores/ui.js');

async function renderPost(ready: boolean) {
	sessionReady.set(ready);
	const data = await load({ params: { handle: 'artist.example', rkey: '3exampleabc12' } } as any);
	const { head, body } = render(Page, { props: { data } as any });
	return head + body;
}

describe('server-rendered direct post page', () => {
	it('renders a plain post, so the leak checks below can fail', async () => {
		appview.profile = profileView();
		appview.thread = threadView();
		expect(await renderPost(false)).toContain(IMAGE);
	});

	it.each([false, true])(
		"leaves an opted-out author's post out of the HTML for a logged-out viewer (session ready: %s)",
		async (ready) => {
			appview.profile = profileView();
			appview.thread = threadView({ authorLabels: [OPT_OUT] });
			const html = await renderPost(ready);
			for (const leak of [NAME, AVATAR, IMAGE, TEXT]) expect(html).not.toContain(leak);
		}
	);
});
