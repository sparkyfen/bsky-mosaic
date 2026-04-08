<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import { theme, toggleTheme } from '$lib/stores/theme.js';
	import { authState, login, logout, restoreSession } from '$lib/stores/auth.js';

	let showAbout = $state(false);

	let { children } = $props();

	onMount(() => {
		restoreSession();
	});

	let showMenu = $state(false);
	let showLoginModal = $state(false);
	let loginHandle = $state('');
	let loginAppPassword = $state('');
	let loginError = $state('');
	let loginLoading = $state(false);

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function closeMenu() {
		showMenu = false;
	}

	function openLogin() {
		showMenu = false;
		showLoginModal = true;
	}

	async function handleLogin() {
		loginError = '';
		loginLoading = true;
		try {
			await login(loginHandle, loginAppPassword);
			showLoginModal = false;
			loginHandle = '';
			loginAppPassword = '';
		} catch (err) {
			loginError = err instanceof Error ? err.message : 'Login failed';
		} finally {
			loginLoading = false;
		}
	}

	function handleLogout() {
		logout();
		showMenu = false;
	}
</script>

<svelte:head>
	<title>BlueMosaic — Visual Mosaic Explorer for Bluesky</title>
	<meta name="description" content="Browse, discover, and enjoy Bluesky photo content in a Pinterest-style mosaic. Explore repost chains and find new accounts." />
	<meta property="og:title" content="BlueMosaic" />
	<meta property="og:description" content="A visual mosaic explorer for Bluesky photos. Browse, discover, and enjoy content across the ATmosphere." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tiles.blue" />
	<meta property="og:image" content="https://tiles.blue/og-image.png" />
	<meta property="og:site_name" content="BlueMosaic" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="BlueMosaic" />
	<meta name="twitter:description" content="A visual mosaic explorer for Bluesky photos." />
	<meta name="twitter:image" content="https://tiles.blue/og-image.png" />
</svelte:head>

<div class="app">
	<header class="header">
		<a href="/" class="header-left">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
			</svg>
			<span class="brand-name">BlueMosaic</span>
		</a>
		<div class="header-center">
			<SearchBar />
		</div>
		<div class="header-right">
			<button class="theme-toggle" onclick={toggleTheme} title="Toggle theme" type="button">
				{#if $theme === 'dark'}
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="4" />
						<path d="M12 2v2" /><path d="M12 20v2" />
						<path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
						<path d="M2 12h2" /><path d="M20 12h2" />
						<path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
					</svg>
				{/if}
			</button>

			<div class="avatar-wrapper">
				<button class="avatar-btn" onclick={toggleMenu} type="button">
					{#if $authState.isAuthenticated && $authState.avatar}
						<img class="avatar-img" src={$authState.avatar} alt="" />
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
					{/if}
				</button>

				{#if showMenu}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div class="menu-backdrop" onclick={closeMenu}></div>
					<div class="dropdown-menu">
						{#if $authState.isAuthenticated}
							<div class="menu-user">
								{#if $authState.avatar}
									<img class="menu-user-avatar" src={$authState.avatar} alt="" />
								{/if}
								<div class="menu-user-info">
									<span class="menu-user-name">{$authState.displayName || $authState.handle}</span>
									<span class="menu-user-handle">@{$authState.handle}</span>
								</div>
							</div>
							<div class="menu-divider"></div>
							<button class="menu-item" onclick={handleLogout} type="button">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" x2="9" y1="12" y2="12" />
								</svg>
								<span>Sign out</span>
							</button>
						{:else}
							<button class="menu-item" onclick={openLogin} type="button">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
									<polyline points="10 17 15 12 10 7" />
									<line x1="15" x2="3" y1="12" y2="12" />
								</svg>
								<span>Sign in with Bluesky</span>
							</button>
						{/if}
						<div class="menu-divider"></div>
						<button class="menu-item" onclick={() => { closeMenu(); goto('/settings'); }} type="button">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
							<span>Settings</span>
						</button>
						<button class="menu-item" onclick={() => { closeMenu(); showAbout = true; }} type="button">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10" />
								<path d="M12 16v-4" />
								<path d="M12 8h.01" />
							</svg>
							<span>About</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</header>
	<div class="mobile-search">
		<SearchBar />
	</div>
	<main>
		{@render children()}
	</main>
	<Footer />
</div>

<TabBar />
<ScrollToTop />

{#if showLoginModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
	<div class="login-backdrop" onclick={(e) => { if (e.target === e.currentTarget) showLoginModal = false; }} role="presentation">
		<div class="login-modal" role="dialog" aria-modal="true">
			<button class="login-close" onclick={() => showLoginModal = false} type="button" aria-label="Close">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18" /><path d="m6 6 12 12" />
				</svg>
			</button>
			<div class="login-header">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
				</svg>
				<h2>Sign in with Bluesky</h2>
				<p>Use an <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer">App Password</a> to sign in securely.</p>
			</div>
			<form class="login-form" onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
				<label class="login-field">
					<span>Handle</span>
					<input type="text" bind:value={loginHandle} placeholder="alice.bsky.social" disabled={loginLoading} />
				</label>
				<label class="login-field">
					<span>App Password</span>
					<input type="password" bind:value={loginAppPassword} placeholder="xxxx-xxxx-xxxx-xxxx" disabled={loginLoading} />
				</label>
				{#if loginError}
					<div class="login-error">{loginError}</div>
				{/if}
				<button class="login-submit" type="submit" disabled={loginLoading || !loginHandle.trim() || !loginAppPassword.trim()}>
					{loginLoading ? 'Signing in...' : 'Sign in'}
				</button>
			</form>
		</div>
	</div>
{/if}

{#if showAbout}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
	<div class="login-backdrop" onclick={(e) => { if (e.target === e.currentTarget) showAbout = false; }} role="presentation">
		<div class="about-modal" role="dialog" aria-modal="true">
			<button class="login-close" onclick={() => showAbout = false} type="button" aria-label="Close">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18" /><path d="m6 6 12 12" />
				</svg>
			</button>
			<div class="about-content">
				<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
				</svg>
				<h2>BlueMosaic</h2>
				<p class="about-version">Version 0.0.1</p>
				<p class="about-desc">A Pinterest-style photo mosaic viewer for the Bluesky social network. Browse visual content, discover new accounts through repost chains, and explore the ATmosphere.</p>
				<div class="about-section">
					<h3>Built with</h3>
					<p>SvelteKit, AT Protocol SDK, and the Bluesky public API.</p>
				</div>
				<div class="about-section">
					<h3>Disclaimer</h3>
					<p>BlueMosaic is an independent, open-source project. It is not affiliated with, endorsed by, or sponsored by Bluesky Social PBC. "Bluesky" and the Bluesky logo are trademarks of Bluesky Social PBC.</p>
				</div>
				<div class="about-section">
					<h3>Privacy</h3>
					<p>BlueMosaic does not collect, store, or transmit any personal data. All API requests are made directly from your browser to the Bluesky public API. Login credentials are stored locally in your browser and never sent to our servers.</p>
				</div>
				<div class="about-links">
					<a href="https://bsky.app/profile/tiles.blue" target="_blank" rel="noopener noreferrer">@tiles.blue</a>
					<a href="https://github.com/sparkyfen/bsky-mosaic" target="_blank" rel="noopener noreferrer">GitHub</a>
					<a href="/terms">Terms</a>
					<a href="/privacy">Privacy</a>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(:root),
	:global([data-theme='dark']) {
		--bg: #111111;
		--bg-surface: #F2F3F0;
		--bg-card: #1A1A1A;
		--bg-muted: #2E2E2E;
		--fg: #ffffff;
		--fg-muted: #A1A1AA;
		--fg-subtle: #71717A;
		--fg-dim: #666666;
		--border: #2E2E2E;
		--border-light: #CBCCC9;
		--accent-purple: #A855F7;
		--accent-purple-hover: #9333EA;
		--header-bg: #1A1A1A;
		--controls-bg: #1A1A1A;
		--controls-fg: #B8B9B6;
		--input-bg: transparent;
		--input-border: #2E2E2E;
		--card-bg: #1A1A1A;
		--mosaic-bg: #111111;
		--search-bg: transparent;
	}

	:global([data-theme='light']) {
		--bg: #F2F3F0;
		--bg-surface: #F2F3F0;
		--bg-card: #ffffff;
		--bg-muted: #E7E8E5;
		--fg: #111111;
		--fg-muted: #666666;
		--fg-subtle: #71717A;
		--fg-dim: #999999;
		--border: #CBCCC9;
		--border-light: #E7E8E5;
		--accent-purple: #A855F7;
		--accent-purple-hover: #9333EA;
		--header-bg: #ffffff;
		--controls-bg: #E7E8E5;
		--controls-fg: #666666;
		--input-bg: #ffffff;
		--input-border: #CBCCC9;
		--card-bg: #ffffff;
		--mosaic-bg: #F2F3F0;
		--search-bg: #F2F3F0;
	}

	:global(body) {
		font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
		background: var(--bg);
		color: var(--fg);
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
		padding: 0 32px;
		background: var(--header-bg);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
	}

	.brand-name {
		font-family: 'Geist', sans-serif;
		font-size: 18px;
		font-weight: 700;
		color: var(--fg);
	}

	.header-center {
		display: flex;
		align-items: center;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	/* Theme toggle - circular button matching design */
	.theme-toggle {
		width: 36px;
		height: 36px;
		border-radius: 9999px;
		background: var(--bg-muted);
		border: 1px solid color-mix(in srgb, var(--border) 100%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-muted);
		cursor: pointer;
		padding: 0;
		transition: color 0.2s, background 0.2s;
	}

	.theme-toggle:hover {
		color: var(--fg);
		background: var(--border);
	}

	/* Avatar button */
	.avatar-wrapper {
		position: relative;
	}

	.avatar-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--bg-muted);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-dim);
		cursor: pointer;
		padding: 0;
		overflow: hidden;
		transition: border-color 0.2s;
	}

	.avatar-btn:hover {
		border-color: var(--accent-purple);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Dropdown menu matching design */
	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 220px;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 4px;
		z-index: 100;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border: none;
		border-radius: 2px;
		background: transparent;
		color: var(--fg);
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		cursor: pointer;
		transition: background 0.15s;
		text-align: left;
	}

	.menu-item:hover {
		background: var(--bg-muted);
	}

	.menu-divider {
		height: 1px;
		background: var(--border);
		margin: 4px 0;
	}

	.menu-user {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px;
	}

	.menu-user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
	}

	.menu-user-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.menu-user-name {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--fg);
	}

	.menu-user-handle {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: var(--fg-subtle);
	}

	/* Login modal */
	.login-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: 2rem;
	}

	.login-modal {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 32px;
		width: 100%;
		max-width: 400px;
		position: relative;
	}

	.login-close {
		position: absolute;
		top: 16px;
		right: 16px;
		background: none;
		border: none;
		color: var(--fg-dim);
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
		display: flex;
		transition: color 0.2s;
	}

	.login-close:hover {
		color: var(--fg);
	}

	.login-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		margin-bottom: 24px;
	}

	.login-header h2 {
		font-family: 'Geist', sans-serif;
		font-size: 20px;
		font-weight: 700;
		color: var(--fg);
	}

	.login-header p {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-subtle);
		line-height: 1.4;
	}

	.login-header a {
		color: var(--accent-purple);
		text-decoration: none;
	}

	.login-header a:hover {
		text-decoration: underline;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.login-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.login-field span {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: var(--fg-muted);
	}

	.login-field input {
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--input-bg);
		color: var(--fg);
		font-family: 'Geist Mono', monospace;
		font-size: 14px;
		outline: none;
		transition: border-color 0.2s;
	}

	.login-field input::placeholder {
		color: var(--fg-subtle);
		font-family: 'Geist', sans-serif;
	}

	.login-field input:focus {
		border-color: var(--accent-purple);
	}

	.login-error {
		font-size: 13px;
		color: #FF5C33;
		font-family: 'Geist', sans-serif;
		text-align: center;
	}

	.login-submit {
		padding: 10px 16px;
		background: var(--accent-purple);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.login-submit:hover:not(:disabled) {
		background: var(--accent-purple-hover);
	}

	.login-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	/* About modal */
	.about-modal {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 32px;
		width: 100%;
		max-width: 500px;
		position: relative;
		max-height: 90vh;
		overflow-y: auto;
	}

	.about-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
	}

	.about-content h2 {
		font-family: 'Geist', sans-serif;
		font-size: 24px;
		font-weight: 700;
		color: var(--fg);
	}

	.about-version {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: var(--fg-subtle);
		margin-bottom: 8px;
	}

	.about-desc {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg-muted);
		line-height: 1.5;
		margin-bottom: 8px;
	}

	.about-section {
		width: 100%;
		text-align: left;
		margin-top: 12px;
	}

	.about-section h3 {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--fg);
		margin-bottom: 4px;
	}

	.about-section p {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-muted);
		line-height: 1.5;
	}

	.about-links {
		display: flex;
		gap: 16px;
		margin-top: 20px;
	}

	.about-links a {
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		color: var(--accent-purple);
		text-decoration: none;
	}

	.about-links a:hover {
		text-decoration: underline;
	}

	/* Mobile search bar - hidden on desktop, shown below header on mobile */
	.mobile-search {
		display: none;
		padding: 8px 16px;
		background: var(--header-bg);
	}

	.mobile-search :global(.search-box) {
		width: 100%;
		border-radius: 18px;
		background: var(--bg-muted);
	}

	@media (max-width: 768px) {
		.header {
			height: 48px;
			padding: 0 16px;
		}

		.header-center {
			display: none;
		}

		.brand-name {
			font-size: 16px;
		}

		.theme-toggle {
			display: none;
		}

		.avatar-btn {
			width: 28px;
			height: 28px;
		}

		.mobile-search {
			display: block;
		}

		main {
			padding-bottom: 95px;
		}
	}
</style>
