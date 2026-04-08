import { writable } from 'svelte/store';
import { BskyAgent } from '@atproto/api';

export interface AuthState {
	isAuthenticated: boolean;
	handle: string | null;
	did: string | null;
	avatar: string | null;
	displayName: string | null;
}

export const authState = writable<AuthState>({
	isAuthenticated: false,
	handle: null,
	did: null,
	avatar: null,
	displayName: null
});

let authenticatedAgent: BskyAgent | null = null;

const SESSION_KEY = 'bluemosaic_session';

interface StoredSession {
	accessJwt: string;
	refreshJwt: string;
	handle: string;
	did: string;
}

function saveSession(agent: BskyAgent) {
	if (typeof localStorage === 'undefined' || !agent.session) return;
	const data: StoredSession = {
		accessJwt: agent.session.accessJwt,
		refreshJwt: agent.session.refreshJwt,
		handle: agent.session.handle,
		did: agent.session.did
	};
	localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearSession() {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(SESSION_KEY);
}

function getStoredSession(): StoredSession | null {
	if (typeof localStorage === 'undefined') return null;
	const raw = localStorage.getItem(SESSION_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function getAuthenticatedAgent(): BskyAgent | null {
	return authenticatedAgent;
}

export async function restoreSession(): Promise<boolean> {
	const stored = getStoredSession();
	if (!stored) return false;

	const agent = new BskyAgent({ service: 'https://bsky.social' });
	try {
		await agent.resumeSession({
			accessJwt: stored.accessJwt,
			refreshJwt: stored.refreshJwt,
			handle: stored.handle,
			did: stored.did,
			active: true
		});

		// Refresh profile info
		const profile = await agent.getProfile({ actor: agent.session!.did });

		authenticatedAgent = agent;
		// Save updated tokens after resume
		saveSession(agent);

		authState.set({
			isAuthenticated: true,
			handle: profile.data.handle,
			did: profile.data.did,
			avatar: profile.data.avatar || null,
			displayName: profile.data.displayName || null
		});
		return true;
	} catch {
		clearSession();
		return false;
	}
}

export async function login(handle: string, appPassword: string): Promise<void> {
	const agent = new BskyAgent({ service: 'https://bsky.social' });
	await agent.login({ identifier: handle, password: appPassword });

	const profile = await agent.getProfile({ actor: agent.session!.did });

	authenticatedAgent = agent;
	saveSession(agent);

	authState.set({
		isAuthenticated: true,
		handle: profile.data.handle,
		did: profile.data.did,
		avatar: profile.data.avatar || null,
		displayName: profile.data.displayName || null
	});
}

export function logout() {
	authenticatedAgent = null;
	clearSession();
	authState.set({
		isAuthenticated: false,
		handle: null,
		did: null,
		avatar: null,
		displayName: null
	});
}

export async function followUser(did: string): Promise<string> {
	const agent = getAuthenticatedAgent();
	if (!agent) throw new Error('Not logged in');

	const res = await agent.follow(did);
	return res.uri;
}

export async function unfollowUser(followUri: string): Promise<void> {
	const agent = getAuthenticatedAgent();
	if (!agent) throw new Error('Not logged in');

	await agent.deleteFollow(followUri);
}

export async function getFollowStatus(did: string): Promise<string | null> {
	const agent = getAuthenticatedAgent();
	if (!agent) return null;

	const res = await agent.getProfile({ actor: did });
	const viewer = res.data.viewer;
	return viewer?.following || null;
}
