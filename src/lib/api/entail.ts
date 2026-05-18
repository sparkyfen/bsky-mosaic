const ENTAIL_API = 'https://entail.dev/api';

export interface EntailImageTags {
	cid: string;
	rating: string;
	tags: string[];
}

export interface EntailTagsResponse {
	uri: string;
	images: EntailImageTags[];
}

export async function getPostTags(handle: string, rkey: string): Promise<EntailTagsResponse> {
	const params = new URLSearchParams({ handle, rkey });
	const res = await fetch(`${ENTAIL_API}/tags?${params.toString()}`);

	if (!res.ok) {
		throw new Error(`Entail API error ${res.status}`);
	}

	return (await res.json()) as EntailTagsResponse;
}
