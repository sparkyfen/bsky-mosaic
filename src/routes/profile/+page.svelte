<script lang="ts">
	import { authState } from '$lib/stores/auth.js';
</script>

<div class="profile-page">
	{#if $authState.isAuthenticated}
		<div class="profile-card">
			{#if $authState.avatar}
				<img class="avatar" src={$authState.avatar} alt="" />
			{:else}
				<div class="avatar placeholder">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
				</div>
			{/if}
			<h1>{$authState.displayName || $authState.handle}</h1>
			<p class="handle">@{$authState.handle}</p>
			<a href="https://bsky.app/profile/{$authState.handle}" target="_blank" rel="noopener noreferrer" class="view-btn">View on Bluesky</a>
		</div>
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
		align-items: center;
		justify-content: center;
		padding: 2rem;
		min-height: calc(100vh - 200px);
	}

	.profile-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		margin-bottom: 8px;
	}

	.avatar.placeholder {
		background: var(--bg-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-dim);
	}

	h1 {
		font-family: 'Geist', sans-serif;
		font-size: 22px;
		font-weight: 700;
		color: var(--fg);
	}

	.handle {
		font-family: 'Geist Mono', monospace;
		font-size: 13px;
		color: var(--fg-subtle);
	}

	.view-btn {
		margin-top: 12px;
		padding: 10px 20px;
		border-radius: 9999px;
		border: 1px solid var(--accent-purple);
		color: var(--accent-purple);
		text-decoration: none;
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		transition: background 0.2s;
	}

	.view-btn:hover {
		background: var(--bg-muted);
	}

	.not-logged-in {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
	}

	.not-logged-in p {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg-dim);
		max-width: 280px;
	}
</style>
