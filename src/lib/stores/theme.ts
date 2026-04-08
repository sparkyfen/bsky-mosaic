import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') as Theme : null;

export const theme = writable<Theme>(stored || 'dark');

theme.subscribe((value) => {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', value);
		localStorage.setItem('theme', value);
	}
});

export function toggleTheme() {
	theme.update((t) => (t === 'light' ? 'dark' : 'light'));
}
