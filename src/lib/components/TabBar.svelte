<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/', icon: 'house', label: 'HOME' },
		{ href: '/search', icon: 'search', label: 'SEARCH' },
		{ href: '/settings', icon: 'settings', label: 'SETTINGS' },
		{ href: '/profile', icon: 'user', label: 'PROFILE' }
	] as const;

	const currentPath = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/' || currentPath.startsWith('/mosaic');
		return currentPath.startsWith(href);
	}

	const icons: Record<string, string> = {
		house: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8,M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
		search: 'M11 11 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0-16 0,M21 21 l-4.3-4.3',
		settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z,M12 12 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0-6 0',
		user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2,M12 7 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0-8 0'
	};
</script>

<nav class="tab-bar">
	<div class="tab-pill">
		{#each tabs as tab}
			<a href={tab.href} class="tab" class:active={isActive(tab.href)}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					{#each icons[tab.icon].split(',') as d}
						<path d={d.trim()} />
					{/each}
				</svg>
				<span>{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.tab-bar {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 12px 21px 21px;
		z-index: 90;
		justify-content: center;
	}

	.tab-pill {
		display: flex;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 36px;
		height: 62px;
		padding: 4px;
		width: 100%;
	}

	.tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		border-radius: 26px;
		text-decoration: none;
		color: var(--fg-subtle);
		transition: color 0.2s, background 0.2s;
	}

	.tab span {
		font-family: 'Geist', sans-serif;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.5px;
	}

	.tab.active {
		background: var(--accent-purple);
		color: #ffffff;
	}

	@media (max-width: 768px) {
		.tab-bar {
			display: flex;
		}
	}
</style>
