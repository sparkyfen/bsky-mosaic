import { describe, expect, it } from 'vitest';
import { getPostTags } from './entail.js';

// Shapes recorded from the live API on 2026-10-14, with identifiers replaced
// and the tag list trimmed.
const URI = 'at://did:plc:example/app.bsky.feed.post/3exampleabc12';
const CLASSIFIED = {
	uri: URI,
	model_version: 'furry_conv_next_base_384',
	router_model_version: 'micro_router.full.2026-07-12',
	images: [
		{
			cid: 'bafkreiexamplecid',
			rating: 'questionable',
			rating_score: 0.34,
			router: { furry: 0.96, artwork: 0.96 },
			routed_pass: true,
			tags: [
				{ name: 'mammal', confidence: 1 },
				{ name: 'anthro', confidence: 0.98 }
			]
		}
	]
};
const ENQUEUED = { uri: URI, status: 'enqueued' };

function json(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/** A fake entail server that answers each request from a script, in order,
 * and records how many requests reached it. */
function server(...replies: Array<(url: URL) => Response>) {
	const hits: URL[] = [];
	const fetchImpl = (async (input: RequestInfo | URL) => {
		const url = new URL(String(input));
		hits.push(url);
		const reply = replies[Math.min(hits.length - 1, replies.length - 1)];
		return reply(url);
	}) as typeof fetch;
	return { fetchImpl, hits };
}

const noPause = () => Promise.resolve();

describe('getPostTags', () => {
	it('returns the tags for a classified post', async () => {
		const { fetchImpl } = server(() => json(200, CLASSIFIED));
		const result = await getPostTags('did:plc:example', '3exampleabc12', { fetchImpl });
		expect(result.status).toBe('ready');
		if (result.status !== 'ready') return;
		expect(result.post.images[0].tags.map((t) => t.name)).toEqual(['mammal', 'anthro']);
	});

	it('leaves out tags below 0.8 confidence', async () => {
		// Like the live API, the fake drops tags below min_confidence and falls
		// back to the stored 0.3 floor when the parameter is missing.
		const { fetchImpl } = server((url) => {
			const floor = Number(url.searchParams.get('min_confidence') ?? 0.3);
			const tags = [
				{ name: 'mammal', confidence: 1 },
				{ name: 'scatplay', confidence: 0.41 }
			].filter((t) => t.confidence >= floor);
			return json(200, { ...CLASSIFIED, images: [{ ...CLASSIFIED.images[0], tags }] });
		});
		const result = await getPostTags('did:plc:example', '3exampleabc12', { fetchImpl });
		if (result.status !== 'ready') throw new Error('expected ready');
		expect(result.post.images[0].tags.map((t) => t.name)).toEqual(['mammal']);
	});

	it('reports a queued post as pending instead of throwing', async () => {
		const { fetchImpl } = server(() => json(202, ENQUEUED));
		const result = await getPostTags('did:plc:example', '3exampleabc12', {
			fetchImpl,
			pause: noPause
		});
		expect(result).toEqual({ status: 'pending' });
	});

	it('asks entail to hold the request for a fresh classification', async () => {
		// Without wait=true the server answers 202 straight away for any post
		// it hasn't seen, and the post never gets a chance to finish.
		const { fetchImpl } = server((url) =>
			url.searchParams.get('wait') === 'true' ? json(200, CLASSIFIED) : json(202, ENQUEUED)
		);
		const result = await getPostTags('did:plc:example', '3exampleabc12', {
			fetchImpl,
			pause: noPause
		});
		expect(result.status).toBe('ready');
	});

	it('returns the tags once a queued post finishes', async () => {
		const { fetchImpl } = server(
			() => json(202, ENQUEUED),
			() => json(200, CLASSIFIED)
		);
		const result = await getPostTags('did:plc:example', '3exampleabc12', {
			fetchImpl,
			pause: noPause
		});
		expect(result.status).toBe('ready');
	});

	it('gives up after a bounded number of requests', async () => {
		const { fetchImpl, hits } = server(() => json(202, ENQUEUED));
		await getPostTags('did:plc:example', '3exampleabc12', { fetchImpl, pause: noPause });
		expect(hits.length).toBeLessThanOrEqual(3);
	});

	it('stops retrying once the caller aborts', async () => {
		const controller = new AbortController();
		const { fetchImpl, hits } = server(() => {
			controller.abort();
			return json(202, ENQUEUED);
		});
		await expect(
			getPostTags('did:plc:example', '3exampleabc12', {
				fetchImpl,
				pause: noPause,
				signal: controller.signal
			})
		).rejects.toThrow();
		expect(hits.length).toBe(1);
	});

	it('stops waiting between retries as soon as the caller aborts', async () => {
		// Uses the real three-second pause; the abort lands partway through it.
		const controller = new AbortController();
		const { fetchImpl, hits } = server(() => {
			setTimeout(() => controller.abort(), 20);
			return json(202, ENQUEUED);
		});
		const started = Date.now();
		await expect(
			getPostTags('did:plc:example', '3exampleabc12', { fetchImpl, signal: controller.signal })
		).rejects.toThrow();
		expect(Date.now() - started).toBeLessThan(1000);
		expect(hits.length).toBe(1);
	});

	it('rejects a 200 body without an images array with a readable error', async () => {
		const { fetchImpl } = server(() => json(200, { uri: URI }));
		await expect(
			getPostTags('did:plc:example', '3exampleabc12', { fetchImpl })
		).rejects.toThrow(/unexpected/i);
	});

	it('rejects an image entry without a cid or a tags array', async () => {
		for (const image of [{ cid: 'bafkreiexamplecid' }, { tags: [] }]) {
			const { fetchImpl } = server(() => json(200, { uri: URI, images: [image] }));
			await expect(
				getPostTags('did:plc:example', '3exampleabc12', { fetchImpl })
			).rejects.toThrow(/unexpected/i);
		}
	});

	it('rejects a malformed tag or a post without a uri', async () => {
		const image = CLASSIFIED.images[0];
		for (const body of [
			{ ...CLASSIFIED, images: [{ ...image, tags: [{ name: 42, confidence: 1 }] }] },
			{ ...CLASSIFIED, images: [{ ...image, tags: [{ name: 'mammal' }] }] },
			{ ...CLASSIFIED, uri: undefined }
		]) {
			const { fetchImpl } = server(() => json(200, body));
			await expect(
				getPostTags('did:plc:example', '3exampleabc12', { fetchImpl })
			).rejects.toThrow(/unexpected/i);
		}
	});

	it('rejects on an HTTP error', async () => {
		const { fetchImpl } = server(() => json(503, { error: 'Database unavailable' }));
		await expect(
			getPostTags('did:plc:example', '3exampleabc12', { fetchImpl })
		).rejects.toThrow(/503/);
	});
});
