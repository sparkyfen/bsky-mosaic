const CRAWLER_UA_PATTERNS = [
	'discordbot',
	'telegrambot',
	'twitterbot',
	'facebookexternalhit',
	'slackbot-linkexpanding',
	'slack-imgproxy',
	'bluesky cardyb',
	'linkedinbot',
	'whatsapp',
	'mastodon',
	'pleroma',
	'akkoma',
	'misskey',
	'iframely',
	'embedly',
	'googlebot',
	'bingbot',
	'applebot',
	'redditbot',
	'vkshare',
	'yandexbot',
	'duckduckbot'
];

export function isCrawler(userAgent: string | null | undefined): boolean {
	if (!userAgent) return false;
	const ua = userAgent.toLowerCase();
	return CRAWLER_UA_PATTERNS.some((p) => ua.includes(p));
}
