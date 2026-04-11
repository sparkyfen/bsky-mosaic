import { writable } from 'svelte/store';

export type NsfwMode = 'hide' | 'blur' | 'show';
export type FeedOrder = 'discovery' | 'chronological';

export interface AppSettings {
	// Display
	stickyHeader: boolean;
	showRepostBadges: boolean;
	feedOrder: FeedOrder;

	// Accessibility
	reduceMotion: boolean;
	highContrast: boolean;
	showAltText: boolean;

	// Content Filtering
	nsfwMode: NsfwMode;
	showReposts: boolean;
	onlyAltText: boolean;
	minImagesPerPost: number;

	// Crawl
	crawlDepth: number;
	accountsPerLevel: number;
	postsPerAccount: number;
}

const SETTINGS_KEY = 'bluemosaic_settings';

const defaults: AppSettings = {
	stickyHeader: false,
	showRepostBadges: true,
	feedOrder: 'discovery',

	reduceMotion: false,
	highContrast: false,
	showAltText: false,

	nsfwMode: 'hide',
	showReposts: true,
	onlyAltText: false,
	minImagesPerPost: 1,

	crawlDepth: 1,
	accountsPerLevel: 50,
	postsPerAccount: 50
};

function loadSettings(): AppSettings {
	if (typeof localStorage === 'undefined') return { ...defaults };
	const raw = localStorage.getItem(SETTINGS_KEY);
	if (!raw) return { ...defaults };
	try {
		return { ...defaults, ...JSON.parse(raw) };
	} catch {
		return { ...defaults };
	}
}

function saveSettings(settings: AppSettings) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const settings = writable<AppSettings>(loadSettings());

settings.subscribe((value) => {
	saveSettings(value);
});

export function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
	settings.update((s) => ({ ...s, [key]: value }));
}

export function resetSettings() {
	settings.set({ ...defaults });
}
