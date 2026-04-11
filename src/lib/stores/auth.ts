import { writable, get } from 'svelte/store';
import { BskyAgent } from '@atproto/api';

export interface AuthState {
	isAuthenticated: boolean;
	handle: string | null;
	did: string | null;
	avatar: string | null;
	displayName: string | null;
	uwu: boolean;
	adultContentEnabled: boolean;
	ageVerified: boolean;
}

export interface StoredAccount {
	did: string;
	handle: string;
	displayName: string | null;
	avatar: string | null;
	accessJwt: string;
	refreshJwt: string;
	uwu?: boolean;
	adultContentEnabled?: boolean;
	ageVerified?: boolean;
}

export interface AccountsState {
	accounts: StoredAccount[];
	activeDid: string | null;
}

export const authState = writable<AuthState>({
	isAuthenticated: false,
	handle: null,
	did: null,
	avatar: null,
	displayName: null,
	uwu: false,
	adultContentEnabled: false,
	ageVerified: false
});

export const accountsState = writable<AccountsState>({
	accounts: [],
	activeDid: null
});

let authenticatedAgent: BskyAgent | null = null;
const agentCache = new Map<string, BskyAgent>();

const ACCOUNTS_KEY = 'bluemosaic_accounts';
const LEGACY_SESSION_KEY = 'bluemosaic_session';
const FURRYLIST_DID = 'did:plc:jdkvwye2lf4jnoji7v47emft'; // @furryli.st

async function checkFurryList(agent: BskyAgent): Promise<boolean> {
	try {
		const res = await agent.getProfile({ actor: 'furryli.st' });
		return !!res.data.viewer?.followedBy;
	} catch {
		return false;
	}
}

async function checkContentPrefs(agent: BskyAgent): Promise<{ adultContentEnabled: boolean; ageVerified: boolean }> {
	try {
		const prefs = await agent.getPreferences();
		const adultContentEnabled = prefs.moderationPrefs.adultContentEnabled;
		const birthDate = prefs.birthDate;
		const declaredAge = prefs.declaredAge;
		let ageVerified = false;
		if (birthDate) {
			const ageMs = Date.now() - birthDate.getTime();
			ageVerified = ageMs / (365.25 * 24 * 60 * 60 * 1000) >= 18;
		} else if (declaredAge?.isOverAge18) {
			// Fallback: Bluesky may store age declaration without raw birth date
			ageVerified = true;
		}
		// Defensive: if Bluesky says adult content enabled but birth date says minor, restrict
		if (adultContentEnabled && birthDate && !ageVerified) {
			return { adultContentEnabled: false, ageVerified: false };
		}
		return { adultContentEnabled, ageVerified };
	} catch {
		return { adultContentEnabled: false, ageVerified: false };
	}
}

// --- Persistence ---

function loadAccounts(): AccountsState {
	if (typeof localStorage === 'undefined') return { accounts: [], activeDid: null };

	// Migrate legacy single-session format
	const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
	if (legacy) {
		try {
			const s = JSON.parse(legacy);
			const migrated: AccountsState = {
				accounts: [{
					did: s.did,
					handle: s.handle,
					displayName: null,
					avatar: null,
					accessJwt: s.accessJwt,
					refreshJwt: s.refreshJwt
				}],
				activeDid: s.did
			};
			localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(migrated));
			localStorage.removeItem(LEGACY_SESSION_KEY);
			return migrated;
		} catch {
			localStorage.removeItem(LEGACY_SESSION_KEY);
		}
	}

	const raw = localStorage.getItem(ACCOUNTS_KEY);
	if (!raw) return { accounts: [], activeDid: null };
	try {
		return JSON.parse(raw);
	} catch {
		return { accounts: [], activeDid: null };
	}
}

function saveAccounts(state: AccountsState) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state));
}

function updateStoredAccount(did: string, partial: Partial<StoredAccount>) {
	const state = get(accountsState);
	const idx = state.accounts.findIndex(a => a.did === did);
	if (idx === -1) return;
	state.accounts[idx] = { ...state.accounts[idx], ...partial };
	accountsState.set(state);
	saveAccounts(state);
}

// --- Agent management ---

async function resumeAgent(account: StoredAccount): Promise<BskyAgent> {
	const cached = agentCache.get(account.did);
	if (cached?.session) return cached;

	const agent = new BskyAgent({ service: 'https://bsky.social' });
	await agent.resumeSession({
		accessJwt: account.accessJwt,
		refreshJwt: account.refreshJwt,
		handle: account.handle,
		did: account.did,
		active: true
	});
	agentCache.set(account.did, agent);

	// Persist refreshed tokens
	if (agent.session) {
		updateStoredAccount(account.did, {
			accessJwt: agent.session.accessJwt,
			refreshJwt: agent.session.refreshJwt
		});
	}

	return agent;
}

function setActiveAuth(agent: BskyAgent, profile: { did: string; handle: string; avatar?: string; displayName?: string; uwu?: boolean; adultContentEnabled?: boolean; ageVerified?: boolean }) {
	authenticatedAgent = agent;
	authState.set({
		isAuthenticated: true,
		handle: profile.handle,
		did: profile.did,
		avatar: profile.avatar || null,
		displayName: profile.displayName || null,
		uwu: profile.uwu || false,
		adultContentEnabled: profile.adultContentEnabled || false,
		ageVerified: profile.ageVerified || false
	});
}

function clearActiveAuth() {
	authenticatedAgent = null;
	authState.set({
		isAuthenticated: false,
		handle: null,
		did: null,
		avatar: null,
		displayName: null,
		uwu: false,
		adultContentEnabled: false,
		ageVerified: false
	});
}

// --- Public API ---

export function getAuthenticatedAgent(): BskyAgent | null {
	return authenticatedAgent;
}

export function getAccounts(): StoredAccount[] {
	return get(accountsState).accounts;
}

export async function restoreSession(): Promise<boolean> {
	const state = loadAccounts();
	accountsState.set(state);

	if (!state.activeDid || state.accounts.length === 0) return false;

	const active = state.accounts.find(a => a.did === state.activeDid);
	if (!active) return false;

	try {
		const agent = await resumeAgent(active);
		const profile = await agent.getProfile({ actor: agent.session!.did });
		const uwu = await checkFurryList(agent);
		const contentPrefs = await checkContentPrefs(agent);

		setActiveAuth(agent, {
			did: profile.data.did,
			handle: profile.data.handle,
			avatar: profile.data.avatar,
			displayName: profile.data.displayName,
			uwu,
			...contentPrefs
		});

		// Update stored profile info
		updateStoredAccount(active.did, {
			handle: profile.data.handle,
			displayName: profile.data.displayName || null,
			avatar: profile.data.avatar || null,
			uwu,
			...contentPrefs
		});

		return true;
	} catch {
		// Remove broken account
		removeAccount(active.did);
		return false;
	}
}

export async function login(handle: string, appPassword: string): Promise<void> {
	const agent = new BskyAgent({ service: 'https://bsky.social' });
	await agent.login({ identifier: handle, password: appPassword });

	const profile = await agent.getProfile({ actor: agent.session!.did });
	const did = profile.data.did;

	agentCache.set(did, agent);

	const uwu = await checkFurryList(agent);
	const contentPrefs = await checkContentPrefs(agent);

	const account: StoredAccount = {
		did,
		handle: profile.data.handle,
		displayName: profile.data.displayName || null,
		avatar: profile.data.avatar || null,
		accessJwt: agent.session!.accessJwt,
		refreshJwt: agent.session!.refreshJwt,
		uwu,
		...contentPrefs
	};

	// Add or update in accounts list
	const state = get(accountsState);
	const idx = state.accounts.findIndex(a => a.did === did);
	if (idx >= 0) {
		state.accounts[idx] = account;
	} else {
		state.accounts.push(account);
	}
	state.activeDid = did;
	accountsState.set(state);
	saveAccounts(state);

	setActiveAuth(agent, {
		did,
		handle: profile.data.handle,
		avatar: profile.data.avatar,
		displayName: profile.data.displayName,
		uwu,
		...contentPrefs
	});
}

export async function switchAccount(did: string): Promise<void> {
	const state = get(accountsState);
	const account = state.accounts.find(a => a.did === did);
	if (!account) throw new Error('Account not found');

	const agent = await resumeAgent(account);
	const profile = await agent.getProfile({ actor: did });

	state.activeDid = did;
	accountsState.set(state);
	saveAccounts(state);

	setActiveAuth(agent, {
		did: profile.data.did,
		handle: profile.data.handle,
		avatar: profile.data.avatar,
		displayName: profile.data.displayName,
		uwu: account.uwu,
		adultContentEnabled: account.adultContentEnabled,
		ageVerified: account.ageVerified
	});

	// Update stored profile info
	updateStoredAccount(did, {
		handle: profile.data.handle,
		displayName: profile.data.displayName || null,
		avatar: profile.data.avatar || null
	});
}

export function removeAccount(did: string) {
	const state = get(accountsState);
	state.accounts = state.accounts.filter(a => a.did !== did);
	agentCache.delete(did);

	if (state.activeDid === did) {
		if (state.accounts.length > 0) {
			// Switch to first remaining account (sync — lazy resume on next API call)
			const next = state.accounts[0];
			state.activeDid = next.did;
			accountsState.set(state);
			saveAccounts(state);
			// Kick off async switch
			switchAccount(next.did).catch(() => {
				clearActiveAuth();
			});
		} else {
			state.activeDid = null;
			accountsState.set(state);
			saveAccounts(state);
			clearActiveAuth();
		}
	} else {
		accountsState.set(state);
		saveAccounts(state);
	}
}

export function logout() {
	const current = get(authState);
	if (current.did) {
		removeAccount(current.did);
	} else {
		clearActiveAuth();
	}
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
