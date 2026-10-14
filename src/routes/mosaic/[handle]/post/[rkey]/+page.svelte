<script lang="ts">
	import PhotoModal from '$lib/components/PhotoModal.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { authState, getAuthenticatedAgent } from '$lib/stores/auth.js';
	import { settings } from '$lib/stores/settings.js';
	import { sessionReady, showLoginModal } from '$lib/stores/ui.js';

	let { data } = $props();

	const mosaicHref = $derived(`/mosaic/${encodeURIComponent(data.handle)}`);

	function closeModal() {
		goto(mosaicHref);
	}

	// Same rule as the settings page: signed-out viewers, and accounts with
	// adult content off in Bluesky, always get "hide".
	const nsfwMode = $derived(
		$authState.isAuthenticated && $authState.adultContentEnabled ? $settings.nsfwMode : 'hide'
	);
	// Don't decide on a post whose visibility depends on the viewer until the
	// session has restored, so nothing flashes in or out.
	const viewerDependent = $derived(data.requiresAuth || !!data.post?.nsfw);
	const waiting = $derived(!$sessionReady && viewerDependent);
	const authBlocked = $derived(data.requiresAuth && !$authState.isAuthenticated);

	// Remember which post was revealed, and to which account, so a different
	// post or a different account starts gated in the same render instead of
	// a frame later.
	let revealedKey = $state<string | null>(null);
	const revealKey = $derived(data.post ? `${data.post.uri}|${$authState.did}` : null);
	const revealed = $derived(!!revealKey && revealedKey === revealKey);
	const hidden = $derived(!!data.post?.nsfw && nsfwMode === 'hide');
	const gated = $derived(!!data.post?.nsfw && nsfwMode === 'blur' && !revealed);

	// The server renders without a session, so an opted-out author's post comes
	// back empty. Once the viewer is signed in, or switches accounts, rerun the
	// load with their agent.
	//
	// The latest reload started, and for which agent. Plain (non-$state) so the
	// effect never reruns itself: one reload per agent, never a loop. It's keyed
	// on the agent, not the account, so signing in again after a session drops
	// (a new agent) reloads once more. Each reload gets a new record, and
	// settling compares records rather than agents, because switching away and
	// back starts a newer reload for the same agent.
	let latest: { agent: unknown } | null = null;
	// The agent whose reload has finished. If the post is still missing after
	// that, the session dropped, so stop showing "Loading…".
	let reloadSettledFor = $state.raw<unknown>(null);
	$effect(() => {
		if (!data.requiresAuth || !$authState.isAuthenticated || data.viewer === $authState.did) return;
		const agent = getAuthenticatedAgent();
		if (latest?.agent === agent) return;
		// A cached agent can come back (switching accounts), so forget any
		// earlier settlement until this reload finishes.
		reloadSettledFor = null;
		const reload = (latest = { agent });
		// A failed reload settles the same way as an empty one: offer sign-in again.
		invalidateAll()
			.catch(() => {})
			.finally(() => {
				if (latest === reload) reloadSettledFor = agent;
			});
	});
	// Reads $authState so it re-evaluates whenever the active agent changes.
	const reloadFailed = $derived(
		data.requiresAuth && !data.post && $authState.isAuthenticated && reloadSettledFor === getAuthenticatedAgent()
	);
	const view = $derived.by(() => {
		if (waiting) return 'loading';
		if (authBlocked || reloadFailed) return 'signedInOnly';
		if (!data.post) return 'loading';
		if (hidden) return 'hidden';
		if (gated) return 'gated';
		return null;
	});
	const showModal = $derived(view === null);
	const signInHint = $derived(
		reloadFailed ? 'Your sign-in may have expired. Sign in again to see this post.' : 'Sign in to see this post.'
	);
	const hiddenReason = $derived(
		!$authState.isAuthenticated ? 'signedOut' : !$authState.adultContentEnabled ? 'account' : 'settings'
	);
	// Bluesky reports unverified handles as handle.invalid, and load() keeps the
	// URL's DID then, which reads badly as "@did:plc:…".
	const backLabel = $derived(data.handle.startsWith('did:') ? 'Back to profile' : `Back to @${data.handle}`);
	// Reserve the notice's height whenever the post's visibility depends on the
	// viewer, even while the modal (position: fixed) covers it, so going from
	// loading to a gate to the modal never shifts the layout.
	const reserve = $derived(!showModal || viewerDependent);
</script>

<div class="notice" class:active={reserve}>
	{#if view === 'gated'}
		<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
			<path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
			<path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
			<path d="m2 2 20 20" />
		</svg>
	{/if}
	<!-- Always mounted, so screen readers announce each change of state. It
	     holds only the message, so the controls aren't read out with it. -->
	<div class="message" role="status">
		{#if view === 'loading'}
			<p class="status">Loading…</p>
		{:else if view === 'signedInOnly'}
			<p class="status">
				This author has chosen to make their posts visible only to people who are signed in. {signInHint}
			</p>
		{:else if view === 'hidden'}
			{#if hiddenReason === 'signedOut'}
				<p class="status">This post has adult content. To see it, sign in and change your content settings.</p>
			{:else if hiddenReason === 'account'}
				<p class="status">This post has adult content, and your Bluesky account settings hide it.</p>
			{:else}
				<p class="status">This post has adult content, and your content settings hide it.</p>
			{/if}
		{:else if view === 'gated'}
			<h1 class="nsfw-title">Sensitive content</h1>
			<p class="nsfw-subtitle">This post may contain adult content.</p>
		{/if}
	</div>
	{#if view === 'signedInOnly' || (view === 'hidden' && hiddenReason === 'signedOut')}
		<button class="action" onclick={() => ($showLoginModal = true)} type="button">
			{reloadFailed ? 'Sign in again' : 'Sign in'}
		</button>
	{:else if view === 'hidden' && hiddenReason === 'settings'}
		<a class="action" href="/settings">Change content settings</a>
	{:else if view === 'gated'}
		<button class="action" onclick={() => (revealedKey = revealKey)} type="button">
			<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
				<circle cx="12" cy="12" r="3" />
			</svg>
			<span>Show content</span>
		</button>
	{/if}
	{#if view && view !== 'loading'}
		<a class="back" href={mosaicHref}>{backLabel}</a>
	{/if}
</div>

{#if showModal && data.post}
	<PhotoModal post={data.post} imageIndex={0} onclose={closeModal} />
{/if}

<style>
	.notice.active {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 8px;
		min-height: 60vh;
		padding: 3rem;
		text-align: center;
	}

	.message {
		display: grid;
		justify-items: center;
		gap: 8px;
	}

	.status {
		max-inline-size: 60ch;
		margin-inline: auto;
		color: var(--fg);
		font-size: 1.1rem;
		text-wrap: pretty;
	}

	.nsfw-title {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.nsfw-subtitle {
		color: var(--fg-muted);
	}

	.action {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 8px;
		padding: 8px 16px;
		border-radius: 9999px;
		border: 1px solid currentColor;
		background: transparent;
		color: inherit;
		font-family: 'Geist', sans-serif;
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}

	.action:hover {
		background: color-mix(in srgb, currentColor 16%, transparent);
	}

	.action:active {
		background: color-mix(in srgb, currentColor 24%, transparent);
	}

	.action:focus-visible,
	.back:focus-visible {
		outline: 2px solid var(--accent-purple);
		outline-offset: 2px;
	}

	.back {
		margin-top: 8px;
		color: var(--fg-muted);
		font-size: 0.875rem;
	}
</style>
