<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState, accountsState, logout, switchAccount, type StoredAccount } from '$lib/stores/auth.js';
	import { showLoginModal } from '$lib/stores/ui.js';

	const otherAccounts = $derived(
		$accountsState.accounts.filter(a => a.did !== $accountsState.activeDid)
	);

	let switchingDid = $state<string | null>(null);

	async function handleSwitch(did: string) {
		switchingDid = did;
		try {
			await switchAccount(did);
		} catch (err) {
			console.error('Switch failed:', err);
		} finally {
			switchingDid = null;
		}
	}

	function handleSignOut() {
		logout();
	}
</script>

<div class="profile-page">
	{#if $authState.isAuthenticated}
		<!-- Active Account -->
		<div class="section-label">Active Account</div>
		<div class="account-card active-account">
			{#if $authState.avatar}
				<img class="avatar" src={$authState.avatar} alt="" />
			{:else}
				<div class="avatar placeholder">
					<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
				</div>
			{/if}
			<div class="account-info">
				<span class="display-name">{$authState.displayName || $authState.handle}{#if $authState.uwu} 🐾{/if}</span>
				<span class="handle">@{$authState.handle}</span>
				<span class="active-label">Active</span>
			</div>
		</div>

		{#if $authState.uwu}
			<div class="uwu-note">🐾 FurryList member · e621 tags enabled</div>
		{/if}

		<!-- Other Accounts -->
		{#if otherAccounts.length > 0}
			<div class="section-label">Other Accounts</div>
			{#each otherAccounts as account (account.did)}
				<div class="account-card">
					{#if account.avatar}
						<img class="avatar" src={account.avatar} alt="" />
					{:else}
						<div class="avatar placeholder">
							<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</svg>
						</div>
					{/if}
					<div class="account-info">
						<span class="display-name">{account.displayName || account.handle}{#if account.uwu} 🐾{/if}</span>
						<span class="handle">@{account.handle}</span>
						<button class="switch-btn" onclick={() => handleSwitch(account.did)} disabled={switchingDid === account.did} type="button">
							{switchingDid === account.did ? 'Switching...' : 'Switch →'}
						</button>
					</div>
				</div>
			{/each}
		{/if}

		<!-- Actions -->
		<div class="actions">
			<button class="action-btn add" onclick={() => $showLoginModal = true} type="button">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
				Add Account
			</button>
			<button class="action-btn manage" onclick={() => goto('/profile/manage')} type="button">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
				Manage Accounts
			</button>
			<button class="action-btn signout" onclick={handleSignOut} type="button">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF5C33" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
				Sign Out
			</button>
		</div>

		<p class="footer-text">Switching accounts keeps your current page open. All sessions are stored locally in your browser.</p>
	{:else}
		<div class="not-logged-in">
			<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
			<h1>Profile</h1>
			<p>Sign in with your Bluesky account to see your profile here.</p>
		</div>
	{/if}
</div>

<style>
	.profile-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 2rem;
		max-width: 480px;
		margin: 0 auto;
		width: 100%;
		min-height: calc(100vh - 200px);
	}

	.section-label {
		font-family: 'Geist', sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-purple);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 24px;
		margin-bottom: 12px;
	}

	.section-label:first-child {
		margin-top: 0;
	}

	.account-card {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 16px 0;
		border-bottom: 1px solid var(--border);
	}

	.avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar.placeholder {
		background: var(--bg-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-dim);
	}

	.account-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.display-name {
		font-family: 'Geist', sans-serif;
		font-weight: 600;
		font-size: 16px;
		color: var(--fg);
	}

	.handle {
		font-family: 'Geist Mono', monospace;
		color: var(--fg-subtle);
		font-size: 13px;
	}

	.active-label {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		font-weight: 600;
		color: var(--accent-purple);
		margin-top: 2px;
	}

	.switch-btn {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent-purple);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-top: 2px;
		text-align: left;
	}

	.switch-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.uwu-note {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		color: var(--fg-subtle);
		margin-top: 8px;
		padding: 8px 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: 24px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 0;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border);
		cursor: pointer;
		font-family: 'Geist', sans-serif;
		font-size: 15px;
		color: var(--fg);
		text-align: left;
		width: 100%;
	}

	.action-btn.add {
		color: var(--accent-purple);
	}

	.action-btn.signout {
		color: #FF5C33;
		border-bottom: none;
	}

	.footer-text {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		color: var(--fg-subtle);
		text-align: center;
		margin-top: 32px;
		line-height: 1.4;
	}

	.not-logged-in {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		text-align: center;
	}

	.not-logged-in h1 {
		font-family: 'Geist', sans-serif;
		font-size: 22px;
		font-weight: 700;
		color: var(--fg);
	}

	.not-logged-in p {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg-dim);
		max-width: 280px;
	}
</style>
