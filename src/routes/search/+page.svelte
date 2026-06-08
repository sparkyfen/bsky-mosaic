<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		createAgent,
		getPhotoPostsByUris,
		searchPhotoPosts,
		type PhotoPost
	} from '$lib/api/bluesky.js';
	import { searchByTag, type EntailRating, type EntailSearchMatch } from '$lib/api/entail.js';
	import { getAuthenticatedAgent, authState } from '$lib/stores/auth.js';
	import { settings } from '$lib/stores/settings.js';
	import Mosaic from '$lib/components/Mosaic.svelte';
	import PhotoModal from '$lib/components/PhotoModal.svelte';

	let query = $state('');
	let matchAll = $state(true);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let results = $state<PhotoPost[]>([]);
	let searched = $state(false);

	let modalPost = $state<PhotoPost | null>(null);
	let modalImageIndex = $state(0);

	function getAgent() {
		return getAuthenticatedAgent() || createAgent();
	}

	interface ParsedQuery {
		handle: string | null; // set only for a pure account-lookup query
		e621Tags: string[];
		hashtags: string[];
		from: string | null;
	}

	function parseHandleToken(input: string): string {
		let cleaned = input.trim().replace(/^@/, '');
		const urlMatch = cleaned.match(/bsky\.app\/profile\/([^/?#]+)/);
		if (urlMatch) cleaned = urlMatch[1];
		if (cleaned && !cleaned.includes('.')) cleaned = `${cleaned}.bsky.social`;
		return cleaned;
	}

	// e621 tags are canonically lowercase and underscore-joined (fennec_fox,
	// not "fennec fox"). Strip surrounding quotes and map spaces to underscores.
	function normalizeTag(value: string): string {
		return value
			.trim()
			.replace(/^"(.*)"$/s, '$1')
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '_');
	}

	// Parse a query into fields. Each field is introduced by `tag:`, `#`, or
	// `from:` and its value runs until the next introducer (or end). This makes
	// a tag value greedy, so `tag:fennec fox` → `fennec_fox` without quotes,
	// while `tag:wolf tag:forest` still yields two tags. Quotes are optional.
	function parseQuery(input: string): ParsedQuery {
		const trimmed = input.trim();
		const e621Tags: string[] = [];
		const hashtags: string[] = [];
		let from: string | null = null;

		const introRe = /(tag:|from:|#)/gi;
		const intros: { kind: string; start: number; valueStart: number }[] = [];
		let m: RegExpExecArray | null;
		while ((m = introRe.exec(trimmed)) !== null) {
			intros.push({
				kind: m[1].toLowerCase(),
				start: m.index,
				valueStart: m.index + m[1].length
			});
		}

		// No structured fields → treat the whole input as an account lookup.
		if (intros.length === 0) {
			return { handle: parseHandleToken(trimmed), e621Tags, hashtags, from: null };
		}

		for (let i = 0; i < intros.length; i++) {
			const valEnd = i + 1 < intros.length ? intros[i + 1].start : trimmed.length;
			const raw = trimmed.slice(intros[i].valueStart, valEnd).trim();
			if (!raw) continue;
			if (intros[i].kind === 'tag:') {
				const v = normalizeTag(raw);
				if (v) e621Tags.push(v);
			} else if (intros[i].kind === '#') {
				// Hashtags are single words — take only the first.
				const v = raw.split(/\s+/)[0];
				if (v) hashtags.push(v);
			} else {
				// from: — single handle token.
				const v = parseHandleToken(raw.split(/\s+/)[0]);
				if (v) from = v;
			}
		}

		return { handle: null, e621Tags, hashtags, from };
	}

	// Follow the cursor for one entail tag, capped so a single query can't
	// hammer Zenith's CPU-bound server.
	const MAX_MATCHES_PER_TAG = 200;
	async function collectTagMatches(
		tag: string,
		rating?: EntailRating
	): Promise<EntailSearchMatch[]> {
		const all: EntailSearchMatch[] = [];
		let cursor: string | undefined;
		do {
			const res = await searchByTag(tag, { rating, limit: 200, cursor });
			all.push(...res.matches);
			cursor = res.cursor ?? undefined;
		} while (cursor && all.length < MAX_MATCHES_PER_TAG);
		return all;
	}

	// Intersect (AND) or union (OR) per-tag entail matches on image cid, then
	// return the matching post uris in a stable order.
	function combineByCid(perTag: EntailSearchMatch[][], all: boolean): string[] {
		if (perTag.length === 0) return [];
		const cidToUri = new Map<string, string>();
		for (const list of perTag) {
			for (const m of list) if (!cidToUri.has(m.cid)) cidToUri.set(m.cid, m.uri);
		}
		const sets = perTag.map((list) => new Set(list.map((m) => m.cid)));
		let cids: string[];
		if (all) {
			const [first, ...rest] = sets;
			cids = [...first].filter((cid) => rest.every((s) => s.has(cid)));
		} else {
			cids = [...new Set(sets.flatMap((s) => [...s]))];
		}
		const seen = new Set<string>();
		const uris: string[] = [];
		for (const cid of cids) {
			const uri = cidToUri.get(cid);
			if (uri && !seen.has(uri)) {
				seen.add(uri);
				uris.push(uri);
			}
		}
		return uris;
	}

	// Intersect (AND) or union (OR) per-hashtag post lists on post uri.
	function combinePostsByUri(perTag: PhotoPost[][], all: boolean): PhotoPost[] {
		if (perTag.length === 0) return [];
		if (perTag.length === 1) return perTag[0];
		const byUri = new Map<string, PhotoPost>();
		for (const list of perTag) for (const p of list) byUri.set(p.uri, p);
		if (all) {
			const sets = perTag.map((list) => new Set(list.map((p) => p.uri)));
			const [first, ...rest] = sets;
			return [...first]
				.filter((u) => rest.every((s) => s.has(u)))
				.map((u) => byUri.get(u))
				.filter((p): p is PhotoPost => !!p);
		}
		return [...byUri.values()];
	}

	// Submitting just syncs the query into the URL; the $effect below is the
	// single place that runs the search, so the nav SearchBar (?q=…), the page
	// form, and shared links all behave identically.
	function onSubmit(e: Event) {
		e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;
		goto(`/search?q=${encodeURIComponent(trimmed)}`, { keepFocus: true, noScroll: true });
	}

	let lastRun = '';
	$effect(() => {
		const q = page.url.searchParams.get('q') ?? '';
		if (q && q !== lastRun) {
			lastRun = q;
			query = q;
			runSearch();
		}
	});

	async function runSearch() {
		if (loading) return;
		const parsed = parseQuery(query);

		// Pure identity query → route to the account mosaic (original behavior).
		if (parsed.e621Tags.length === 0 && parsed.hashtags.length === 0) {
			if (parsed.handle) goto(`/mosaic/${encodeURIComponent(parsed.handle)}`);
			return;
		}

		if (parsed.hashtags.length > 0 && !$authState.isAuthenticated) {
			error = 'Hashtag search requires signing in with your Bluesky account.';
			results = [];
			searched = true;
			return;
		}

		loading = true;
		error = null;
		searched = true;
		results = [];
		modalPost = null;

		try {
			const agent = getAgent();
			// Respect the account-wide NSFW setting: 'hide' restricts e621 results
			// to safe; 'blur'/'show' allow all ratings (the Mosaic blurs/reveals
			// label-flagged posts per the same setting).
			const rating: EntailRating | undefined = $settings.nsfwMode === 'hide' ? 'safe' : undefined;

			// e621 tag search (reverse lookup via entail) → matching post uris.
			let e621Uris: string[] | null = null;
			if (parsed.e621Tags.length > 0) {
				const perTag = await Promise.all(
					parsed.e621Tags.map((tag) => collectTagMatches(tag, rating))
				);
				e621Uris = combineByCid(perTag, matchAll);
			}

			// Hashtag search (Bluesky searchPosts, authenticated).
			let hashtagPosts: PhotoPost[] | null = null;
			if (parsed.hashtags.length > 0) {
				const perTag = await Promise.all(
					parsed.hashtags.map((h) =>
						searchPhotoPosts(agent, `#${h}`, undefined, 50).then((r) => r.posts)
					)
				);
				hashtagPosts = combinePostsByUri(perTag, matchAll);
			}

			// Combine the two result sets (intersect when both are present).
			let finalPosts: PhotoPost[];
			if (e621Uris !== null && hashtagPosts !== null) {
				const e621Set = new Set(e621Uris);
				finalPosts = hashtagPosts.filter((p) => e621Set.has(p.uri));
			} else if (e621Uris !== null) {
				finalPosts = await getPhotoPostsByUris(agent, e621Uris);
			} else {
				finalPosts = hashtagPosts ?? [];
			}

			// Optional account restriction (from:handle).
			if (parsed.from) {
				const f = parsed.from.toLowerCase();
				finalPosts = finalPosts.filter(
					(p) => p.author.handle.toLowerCase() === f || p.author.did.toLowerCase() === f
				);
			}

			results = finalPosts;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed';
		} finally {
			loading = false;
		}
	}

	function onPhotoClick(post: PhotoPost, imageIndex: number) {
		modalPost = post;
		modalImageIndex = imageIndex;
	}

	function closeModal() {
		modalPost = null;
	}
</script>

<div class="search-page" class:has-results={searched}>
	<div class="search-head">
		<h1>Search</h1>
		<p class="subtitle">
			Find an account, or search by <code>#hashtag</code> and <code>tag:</code> (e621)
		</p>
		<form class="search-form" onsubmit={onSubmit}>
			<input
				type="text"
				bind:value={query}
				placeholder={'handle, #hashtag, or tag:fennec_fox tag:"red panda"'}
			/>
			<button type="submit" disabled={!query.trim() || loading}>
				{loading ? 'Searching…' : 'Search'}
			</button>
		</form>
		<div class="search-options">
			<label class="opt">
				<input type="checkbox" bind:checked={matchAll} />
				Match all tags
			</label>
		</div>
	</div>

	{#if loading}
		<div class="status">Searching…</div>
	{:else if error}
		<div class="status error">{error}</div>
	{:else if searched && results.length === 0}
		<div class="status">No posts found for this search.</div>
	{:else if results.length > 0}
		<div class="results-count">{results.length} result{results.length === 1 ? '' : 's'}</div>
		<Mosaic posts={results} {onPhotoClick} />
	{/if}
</div>

{#if modalPost}
	<PhotoModal post={modalPost} imageIndex={modalImageIndex} onclose={closeModal} />
{/if}

<style>
	.search-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 12px;
		min-height: calc(100vh - 200px);
	}

	/* Once a search has run, anchor the form to the top instead of centering. */
	.search-page.has-results {
		justify-content: flex-start;
		min-height: auto;
	}

	.search-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
	}

	h1 {
		font-family: 'Geist', sans-serif;
		font-size: 24px;
		font-weight: 700;
		color: var(--fg);
	}

	.subtitle {
		color: var(--fg-dim);
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		margin-bottom: 16px;
		text-align: center;
	}

	.subtitle code {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		background: var(--input-bg);
		padding: 1px 5px;
		border-radius: 5px;
		color: var(--accent-purple);
	}

	.search-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		max-width: 400px;
	}

	input[type='text'] {
		padding: 12px 16px;
		border: 1px solid var(--border);
		border-radius: 9999px;
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		outline: none;
		background: var(--input-bg);
		color: var(--fg);
		transition: border-color 0.2s;
	}

	input[type='text']:focus {
		border-color: var(--accent-purple);
	}

	input[type='text']::placeholder {
		color: var(--fg-subtle);
	}

	button {
		padding: 12px 20px;
		background: var(--accent-purple);
		color: #ffffff;
		border: none;
		border-radius: 9999px;
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	button:hover:not(:disabled) {
		background: var(--accent-purple-hover);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.search-options {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.opt {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-dim);
		cursor: pointer;
	}

	.opt input {
		accent-color: var(--accent-purple);
		cursor: pointer;
	}

	.status {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg-dim);
		padding: 24px;
		text-align: center;
	}

	.status.error {
		color: #e5484d;
	}

	.results-count {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-subtle);
		align-self: flex-start;
		padding: 8px 24px 0;
	}

	.search-page.has-results :global(.mosaic) {
		width: 100%;
	}
</style>
