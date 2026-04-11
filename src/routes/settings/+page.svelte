<script lang="ts">
	import { settings, updateSetting, resetSettings, type NsfwMode, type FeedOrder } from '$lib/stores/settings.js';
	import { theme, toggleTheme } from '$lib/stores/theme.js';
	import { authState } from '$lib/stores/auth.js';

	const nsfwLocked = $derived(!$authState.isAuthenticated || !$authState.adultContentEnabled);

	function cycleNsfwMode() {
		if (nsfwLocked) return;
		const modes: NsfwMode[] = ['hide', 'blur', 'show'];
		const idx = modes.indexOf($settings.nsfwMode);
		updateSetting('nsfwMode', modes[(idx + 1) % modes.length]);
	}

	function cycleFeedOrder() {
		const next: FeedOrder = $settings.feedOrder === 'discovery' ? 'chronological' : 'discovery';
		updateSetting('feedOrder', next);
	}

	const feedOrderLabels: Record<FeedOrder, string> = {
		discovery: 'Discovery',
		chronological: 'Chronological'
	};

	function handleClearCache() {
		if (typeof caches !== 'undefined') {
			caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
		}
	}

	const nsfwLabels: Record<NsfwMode, string> = {
		hide: 'Hide all',
		blur: 'Blur',
		show: 'Show'
	};
</script>

<div class="settings-page">
	<div class="settings-header">
		<h1>Settings</h1>
		<p class="subtitle">Customize your BlueMosaic experience</p>
	</div>

	<div class="settings-body">
		<div class="column">
			<!-- Display -->
			<div class="section-header">
				<h2>Display</h2>
				<p>Appearance and layout preferences</p>
			</div>
			<div class="card">
				<button class="setting-row" onclick={toggleTheme} type="button">
					<span class="setting-label">Theme</span>
					<span class="setting-value">{$theme === 'dark' ? 'Dark' : 'Light'}</span>
				</button>
				<div class="divider"></div>
				<div class="setting-row">
					<span class="setting-label">Show repost badges</span>
					<label class="toggle">
						<input type="checkbox" checked={$settings.showRepostBadges} onchange={() => updateSetting('showRepostBadges', !$settings.showRepostBadges)} />
						<span class="toggle-track"></span>
					</label>
				</div>
			</div>

			<!-- Content Filtering -->
			<div class="section-header">
				<h2>Content Filtering</h2>
				<p>Control what appears in your mosaic feed</p>
			</div>
			<div class="card">
				<button class="setting-row" onclick={cycleFeedOrder} type="button">
					<span class="setting-label">Feed order</span>
					<span class="setting-value">{feedOrderLabels[$settings.feedOrder]}</span>
				</button>
				<div class="divider"></div>
				<button class="setting-row" class:locked={nsfwLocked} onclick={cycleNsfwMode} type="button" disabled={nsfwLocked}>
					<span class="setting-label">NSFW content</span>
					<span class="setting-value" class:muted={$settings.nsfwMode === 'hide'}>{nsfwLocked ? 'Hide all' : nsfwLabels[$settings.nsfwMode]}</span>
				</button>
				{#if nsfwLocked}
					<p class="setting-note">{$authState.isAuthenticated ? 'Adult content is restricted by your Bluesky account settings.' : 'Sign in to change content settings.'}</p>
				{/if}
				<div class="divider"></div>
				<div class="setting-row">
					<span class="setting-label">Show reposts in grid</span>
					<label class="toggle">
						<input type="checkbox" checked={$settings.showReposts} onchange={() => updateSetting('showReposts', !$settings.showReposts)} />
						<span class="toggle-track"></span>
					</label>
				</div>
				<div class="divider"></div>
				<div class="setting-row">
					<span class="setting-label">Only show posts with alt text</span>
					<label class="toggle">
						<input type="checkbox" checked={$settings.onlyAltText} onchange={() => updateSetting('onlyAltText', !$settings.onlyAltText)} />
						<span class="toggle-track"></span>
					</label>
				</div>
				<div class="divider"></div>
				<button class="setting-row" onclick={() => { const n = $settings.minImagesPerPost >= 4 ? 1 : $settings.minImagesPerPost + 1; updateSetting('minImagesPerPost', n); }} type="button">
					<span class="setting-label">Minimum images per post</span>
					<span class="setting-value">{$settings.minImagesPerPost}</span>
				</button>
			</div>
		</div>

		<div class="column">
			<!-- Data & Privacy -->
			<div class="section-header">
				<h2>Data & Privacy</h2>
				<p>Manage your local data and preferences</p>
			</div>
			<div class="card">
				<div class="setting-row">
					<span class="setting-label">Hidden accounts</span>
					<span class="setting-value">Session only</span>
				</div>
				<div class="divider"></div>
				<button class="setting-row" onclick={handleClearCache} type="button">
					<span class="setting-label">Clear image cache</span>
					<span class="setting-action destructive">Clear</span>
				</button>
				<div class="divider"></div>
				<button class="setting-row" onclick={() => { resetSettings(); }} type="button">
					<span class="setting-label">Reset to defaults</span>
					<span class="setting-action accent">Reset</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.settings-page {
		flex: 1;
		background: var(--bg);
	}

	.settings-header {
		background: var(--header-bg);
		border-bottom: 1px solid var(--border);
		padding: 20px 32px;
	}

	.settings-header h1 {
		font-family: 'Geist', sans-serif;
		font-size: 28px;
		font-weight: 700;
		color: var(--fg);
	}

	.subtitle {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg-subtle);
		margin-top: 2px;
	}

	.settings-body {
		display: flex;
		gap: 48px;
		padding: 40px 48px;
	}

	.column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.section-header h2 {
		font-family: 'Geist', sans-serif;
		font-size: 16px;
		font-weight: 600;
		color: var(--fg);
	}

	.section-header p {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-subtle);
	}

	.card {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.divider {
		height: 1px;
		background: var(--border);
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}

	.setting-label {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg);
	}

	.setting-value {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-muted);
	}

	.setting-value.muted {
		color: var(--fg-subtle);
	}

	.setting-row.locked {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.setting-note {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		color: var(--fg-subtle);
		line-height: 1.4;
		margin-top: -8px;
	}

	.setting-action {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		cursor: pointer;
	}

	.setting-action.destructive {
		color: #FF5C33;
	}

	.setting-action.accent {
		color: var(--accent-purple);
	}

	.toggle {
		position: relative;
		display: inline-block;
		width: 32px;
		height: 20px;
		cursor: pointer;
	}

	.toggle input {
		opacity: 0;
		width: 0;
		height: 0;
		position: absolute;
	}

	.toggle-track {
		position: absolute;
		inset: 0;
		background: var(--border);
		border-radius: 10px;
		transition: background 0.2s;
	}

	.toggle-track::after {
		content: '';
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--fg);
		top: 3px;
		left: 3px;
		transition: transform 0.2s;
	}

	.toggle input:checked + .toggle-track {
		background: var(--accent-purple);
	}

	.toggle input:checked + .toggle-track::after {
		transform: translateX(12px);
	}

	@media (max-width: 768px) {
		.settings-body {
			flex-direction: column;
			padding: 24px 16px;
			gap: 24px;
		}
	}
</style>
