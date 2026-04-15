import { BskyAgent } from '@atproto/api';

const PUBLIC_API = 'https://public.api.bsky.app';
const SITE_NAME = 'tiles.blue';
const THEME_COLOR = '#A855F7';

function serverAgent() {
	return new BskyAgent({ service: PUBLIC_API });
}

export interface EmbedImage {
	url: string;
	alt?: string;
	width?: number;
	height?: number;
}

export interface EmbedMeta {
	title: string;
	description: string;
	images: EmbedImage[];
	url: string;
	canonical?: string;
	type?: 'website' | 'article';
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function truncate(s: string | undefined | null, max: number): string {
	if (!s) return '';
	const cleaned = s.replace(/\s+/g, ' ').trim();
	return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned;
}

export function buildEmbedHtml(meta: EmbedMeta): string {
	const e = escapeHtml;
	const imageTags = meta.images
		.map((img) => {
			const parts = [`<meta property="og:image" content="${e(img.url)}" />`];
			if (img.alt) parts.push(`<meta property="og:image:alt" content="${e(img.alt)}" />`);
			if (img.width) parts.push(`<meta property="og:image:width" content="${img.width}" />`);
			if (img.height) parts.push(`<meta property="og:image:height" content="${img.height}" />`);
			return parts.join('\n');
		})
		.join('\n');

	const primaryImage = meta.images[0]?.url ?? '';
	const canonical = meta.canonical ?? meta.url;

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${e(meta.title)}</title>
<meta name="description" content="${e(meta.description)}" />
<link rel="canonical" href="${e(canonical)}" />
<meta property="og:site_name" content="${e(SITE_NAME)}" />
<meta property="og:type" content="${meta.type ?? 'website'}" />
<meta property="og:title" content="${e(meta.title)}" />
<meta property="og:description" content="${e(meta.description)}" />
<meta property="og:url" content="${e(meta.url)}" />
${imageTags}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${e(meta.title)}" />
<meta name="twitter:description" content="${e(meta.description)}" />
${primaryImage ? `<meta name="twitter:image" content="${e(primaryImage)}" />` : ''}
<meta name="theme-color" content="${THEME_COLOR}" />
</head>
<body>
<p><a href="${e(canonical)}">${e(meta.title)}</a></p>
</body>
</html>`;
}

// Build a mosaic URL via FxEmbed's hosted compositing service. Needed
// because Telegram only renders the first og:image tag, so multi-image
// posts need to be pre-composited into a single image. Usage approved
// by dangeredwolf (FxEmbed maintainer) for tiles.blue embeds.
//
// The `:3` segment is not an image count — it's a hardcoded placeholder
// that keeps the mosaic URL path compatible with the equivalent Twitter
// mosaic URLs (per dangeredwolf).
function buildMosaicImageUrl(images: EmbedImage[]): string | null {
	const params: string[] = [];
	for (const img of images.slice(0, 4)) {
		const m = img.url.match(/\/img\/feed_fullsize\/plain\/([^/]+)\/([^/?]+)/);
		if (!m) return null;
		params.push(`${m[1]}_${m[2]}`);
	}
	if (params.length < 2) return null;
	return `https://mosaic.fxbsky.app/jpeg/:3/${params.join('/')}`;
}

function extractImages(embed: any): EmbedImage[] {
	let raw: any[] = [];
	if (embed?.$type === 'app.bsky.embed.images#view') {
		raw = embed.images;
	} else if (
		embed?.$type === 'app.bsky.embed.recordWithMedia#view' &&
		embed.media?.$type === 'app.bsky.embed.images#view'
	) {
		raw = embed.media.images;
	}
	return raw.map((img: any) => ({
		url: img.fullsize,
		alt: img.alt || undefined,
		width: img.aspectRatio?.width,
		height: img.aspectRatio?.height
	}));
}

export async function buildProfileEmbed(handle: string, url: string): Promise<string> {
	const agent = serverAgent();
	const profileRes = await agent.getProfile({ actor: handle });
	const profile = profileRes.data;

	const images: EmbedImage[] = profile.avatar ? [{ url: profile.avatar }] : [];

	const name = profile.displayName || profile.handle;
	const title = `${name} — ${SITE_NAME}`;
	const descParts: string[] = [];
	if (profile.description) descParts.push(truncate(profile.description, 160));
	if (typeof profile.postsCount === 'number') descParts.push(`${profile.postsCount} posts`);
	const description = descParts.join(' · ') || `@${profile.handle} on ${SITE_NAME}`;

	return buildEmbedHtml({ title, description, images, url, canonical: url });
}

export async function buildPostEmbed(handle: string, rkey: string, url: string): Promise<string> {
	const agent = serverAgent();
	const profileRes = await agent.getProfile({ actor: handle });
	const uri = `at://${profileRes.data.did}/app.bsky.feed.post/${rkey}`;
	const threadRes = await agent.getPostThread({ uri, depth: 0 });

	const thread = threadRes.data.thread as any;
	if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
		throw new Error('Post not found');
	}
	const post = thread.post;
	const images = extractImages(post.embed);

	let embedImages: EmbedImage[] = images;
	if (images.length >= 2) {
		const mosaicUrl = buildMosaicImageUrl(images);
		if (mosaicUrl) {
			embedImages = [{ url: mosaicUrl }];
		}
	}

	if (embedImages.length === 0 && post.author.avatar) {
		embedImages = [{ url: post.author.avatar }];
	}

	const name = post.author.displayName || post.author.handle;
	const title = `${name} on ${SITE_NAME}`;
	const text = (post.record as any)?.text ?? '';
	const description = truncate(text, 200) || `Photo by @${post.author.handle}`;

	return buildEmbedHtml({
		title,
		description,
		images: embedImages,
		url,
		canonical: url,
		type: 'article'
	});
}
