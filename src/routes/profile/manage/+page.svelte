<script lang="ts">
	import { goto } from '$app/navigation';
	import { accountsState, removeAccount } from '$lib/stores/auth.js';
	import { showLoginModal } from '$lib/stores/ui.js';

	function handleSignOut(did: string) {
		removeAccount(did);
	}

	function handleAdd() {
		$showLoginModal = true;
	}
</script>

<div class="manage-page">
	<div class="manage-top">
		<button class="back-btn" onclick={() => goto('/profile')} type="button" aria-label="Back">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
		</button>
		<h1>Manage Accounts</h1>
	</div>

	<div class="section-label">Accounts</div>

	<div class="account-list">
		{#each $accountsState.accounts as account (account.did)}
			<div class="account-row">
				<div class="row-left">
					{#if account.avatar}
						<img class="avatar" src={account.avatar} alt="" />
					{:else}
						<div class="avatar placeholder">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
						</div>
					{/if}
					<div class="row-info">
						<span class="row-name">{account.displayName || account.handle}{#if account.uwu} 🐾{/if}</span>
						<span class="row-handle">@{account.handle}</span>
						{#if account.did === $accountsState.activeDid}
							<span class="active-label">Active</span>
						{/if}
					</div>
				</div>
				<button class="signout-btn" onclick={() => handleSignOut(account.did)} type="button">Sign out</button>
			</div>
		{/each}
	</div>

	<button class="add-btn" onclick={handleAdd} type="button">
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
		+ Add Bluesky Account
	</button>

	<p class="footer-text">Signing out of an account removes it from this list. You can re-add it anytime.</p>
</div>

<style>
	.manage-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 16px;
		max-width: 480px;
		margin: 0 auto;
		width: 100%;
	}

	.manage-top {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 24px;
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--fg-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
		display: flex;
		transition: color 0.2s;
	}

	.back-btn:hover {
		color: var(--fg);
	}

	.manage-top h1 {
		font-family: 'Geist', sans-serif;
		font-size: 20px;
		font-weight: 700;
		color: var(--fg);
	}

	.section-label {
		font-family: 'Geist', sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-purple);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 8px;
	}

	.account-list {
		display: flex;
		flex-direction: column;
	}

	.account-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 0;
		border-bottom: 1px solid var(--border);
	}

	.row-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.avatar {
		width: 40px;
		height: 40px;
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

	.row-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.row-name {
		font-family: 'Geist', sans-serif;
		font-size: 15px;
		font-weight: 600;
		color: var(--fg);
	}

	.row-handle {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: var(--fg-subtle);
	}

	.active-label {
		font-family: 'Geist', sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-purple);
		margin-top: 1px;
	}

	.signout-btn {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: #FF5C33;
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 6px;
		flex-shrink: 0;
		transition: background 0.2s;
	}

	.signout-btn:hover {
		background: color-mix(in srgb, #FF5C33 10%, transparent);
	}

	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 14px;
		margin-top: 24px;
		background: var(--accent-purple);
		color: #ffffff;
		border: none;
		border-radius: 9999px;
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.add-btn:hover {
		background: var(--accent-purple-hover);
	}

	.footer-text {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		color: var(--fg-subtle);
		text-align: center;
		margin-top: 20px;
		line-height: 1.4;
	}
</style>
