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
	model_version: string;
	router_model_version: string | null;
	images: EntailImageTags[];
}

/**
 * Forward lookup: given a Bluesky post, return per-image e621 tags with
 * confidence scores. Hits GET /post (formerly /tags). Pass `force` to bypass
 * the furry-artwork router gate and tag every image.
 */
export async function getPostTags(
	handle: string,
	rkey: string,
	force = false
): Promise<EntailPostResponse> {
	const params = new URLSearchParams({ handle, rkey });
	if (force) params.set('force', 'true');
	const res = await fetch(`${ENTAIL_API}/post?${params.toString()}`);

	if (!res.ok) {
		throw new Error(`Entail API error ${res.status}`);
	}

	return (await res.json()) as EntailPostResponse;
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
