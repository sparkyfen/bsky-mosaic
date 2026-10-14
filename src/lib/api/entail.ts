const ENTAIL_API = 'https://entail.dev/api';

export type EntailRating = 'safe' | 'questionable' | 'explicit';

export interface EntailTagScore {
	name: string;
	confidence: number;
}

export interface EntailRouterScores {
	furry: number;
	artwork: number;
}

export interface EntailImageTags {
	cid: string;
	rating: string | null;
	rating_score: number | null;
	router: EntailRouterScores | null;
	routed_pass: boolean | null;
	tags: EntailTagScore[];
}

export interface EntailPostResponse {
	uri: string;
	model_version: string | null;
	router_model_version: string | null;
	/** Empty when the router found no furry artwork in the post. */
	images: EntailImageTags[];
}

/** `pending` means entail queued the post but hasn't classified it yet. */
export type EntailPostResult =
	| { status: 'ready'; post: EntailPostResponse }
	| { status: 'pending' };

export interface EntailPostOptions {
	signal?: AbortSignal;
	fetchImpl?: typeof fetch;
	pause?: (ms: number) => Promise<void>;
}

// With wait=true, entail holds a request for a post it hasn't classified for
// about five seconds before answering 202, so two attempts give a fresh post
// roughly ten seconds of classifier time without hammering the queue.
const POST_ATTEMPTS = 2;
const POST_RETRY_PAUSE_MS = 3000;
// entail returns every tag above its 0.3 storage floor by default, which is
// about 50 per image and noisy; 0.8 keeps the ones worth showing.
const POST_MIN_CONFIDENCE = '0.8';

function isTagScore(tag: unknown): boolean {
	const { name, confidence } = (tag ?? {}) as { name?: unknown; confidence?: unknown };
	return typeof name === 'string' && typeof confidence === 'number';
}

/** The modal keys tags by `cid` and renders each tag's name, so those have to
 * be there and be the right type. */
function isImageEntry(entry: unknown): boolean {
	const { cid, tags } = (entry ?? {}) as { cid?: unknown; tags?: unknown };
	return typeof cid === 'string' && Array.isArray(tags) && tags.every(isTagScore);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Forward lookup: given a Bluesky post, return per-image e621 tags with
 * confidence scores. Hits GET /post. A post entail hasn't indexed yet comes
 * back 202 `{uri, status: "enqueued"}`; that is retried a bounded number of
 * times and then reported as `pending`. Rejects on HTTP errors, an
 * unrecognized body, or when `signal` aborts.
 */
export async function getPostTags(
	handle: string,
	rkey: string,
	{ signal, fetchImpl = fetch, pause = sleep }: EntailPostOptions = {}
): Promise<EntailPostResult> {
	const params = new URLSearchParams({
		handle,
		rkey,
		min_confidence: POST_MIN_CONFIDENCE,
		wait: 'true'
	});
	const url = `${ENTAIL_API}/post?${params.toString()}`;

	for (let attempt = 0; attempt < POST_ATTEMPTS; attempt++) {
		if (attempt > 0) await pause(POST_RETRY_PAUSE_MS);
		signal?.throwIfAborted();
		const res = await fetchImpl(url, { signal });
		signal?.throwIfAborted();

		if (res.status === 202) continue;
		if (!res.ok) {
			throw new Error(`Entail API error ${res.status}`);
		}

		const body = (await res.json()) as Partial<EntailPostResponse> | null;
		if (
			typeof body?.uri !== 'string' ||
			!Array.isArray(body.images) ||
			!body.images.every(isImageEntry)
		) {
			throw new Error('Unexpected response from entail');
		}
		return { status: 'ready', post: body as EntailPostResponse };
	}

	return { status: 'pending' };
}

export interface EntailSearchMatch {
	uri: string;
	cid: string;
	rating: string;
	confidence: number;
	indexed_at: string;
}

export interface EntailSearchResponse {
	matches: EntailSearchMatch[];
	cursor: string | null;
}

export interface EntailSearchOptions {
	rating?: EntailRating;
	/** Max results, clamped server-side to 200. Defaults to 50. */
	limit?: number;
	/** Opaque pagination cursor from a previous response. */
	cursor?: string;
}

/**
 * Reverse lookup: given a single e621 tag, return matching Bluesky posts.
 * Hits GET /search. The API only supports one tag per call — for multi-tag
 * AND/OR queries, fan out one call per tag and intersect/union on uri+cid.
 * May return 503 while the inference server is migrating/under load.
 */
export async function searchByTag(
	tag: string,
	opts: EntailSearchOptions = {}
): Promise<EntailSearchResponse> {
	const params = new URLSearchParams({ tag });
	if (opts.rating) params.set('rating', opts.rating);
	if (opts.limit != null) params.set('limit', String(opts.limit));
	if (opts.cursor) params.set('cursor', opts.cursor);

	const res = await fetch(`${ENTAIL_API}/search?${params.toString()}`);

	if (!res.ok) {
		throw new Error(`Entail search error ${res.status}`);
	}

	const data = (await res.json()) as EntailSearchResponse;
	return { matches: data.matches ?? [], cursor: data.cursor ?? null };
}
