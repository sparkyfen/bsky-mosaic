<script lang="ts">
	import { page } from '$app/state';
	import { createAgent, getProfile, getPhotoPosts, type PhotoPost, type ProfileInfo } from '$lib/api/bluesky.js';
	import { crawlReposts } from '$lib/api/crawler.js';
	import { authState, followUser, unfollowUser, getFollowStatus } from '$lib/stores/auth.js';
	import { settings, updateSetting } from '$lib/stores/settings.js';
	import Mosaic from '$lib/components/Mosaic.svelte';
	import PhotoModal from '$lib/components/PhotoModal.svelte';
	import DepthControl from '$lib/components/DepthControl.svelte';

	let profile = $state<ProfileInfo | null>(null);
	let posts = $state<PhotoPost[]>([]);
	let seenUris = new Set<string>();
	let hiddenDids = $state(new Set<string>());
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedPost = $state<PhotoPost | null>(null);
	let selectedImageIndex = $state(0);

	const visiblePosts = $derived(posts.filter(p => !hiddenDids.has(p.author.did)));

	let crawlActive = $state(false);
	let crawlStatus = $state('');

	// Follow state
	let followUri = $state<string | null>(null);
	let followLoading = $state(false);

	const handle = $derived(decodeURIComponent(page.params.handle));

	function formatCount(n: number | undefined): string {
		if (n == null) return '0';
		if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
		return n.toLocaleString();
	}

	$effect(() => {
		handle;
		loadProfile();
	});

	// Check follow status when logged in and profile loaded
	$effect(() => {
		if ($authState.isAuthenticated && profile) {
			checkFollowStatus(profile.did);
		} else {
			followUri = null;
		}
	});

	async function checkFollowStatus(did: string) {
		try {
			followUri = await getFollowStatus(did);
		} catch {
			followUri = null;
		}
	}

	async function handleFollow() {
		if (!profile || followLoading) return;
		followLoading = true;
		try {
			if (followUri) {
				await unfollowUser(followUri);
				followUri = null;
			} else {
				followUri = await followUser(profile.did);
			}
		} catch (err) {
			console.error('Follow/unfollow failed:', err);
		} finally {
			followLoading = false;
		}
	}

	let loadingMore = $state(false);
	let feedCursor = $state<string | undefined>(undefined);
	let feedDone = $state(false);

	async function loadProfile() {
		loading = true;
		error = null;
		posts = [];
		seenUris = new Set();
		hiddenDids = new Set();
		feedCursor = undefined;
		feedDone = false;

		try {
			const agent = createAgent();
			profile = await getProfile(agent, handle);

			// Load first page, then show immediately
			const result = await getPhotoPosts(agent, handle, undefined, 50);
			for (const p of result.posts) seenUris.add(p.uri);
			posts = result.posts;
			feedCursor = result.cursor;
			feedDone = !result.cursor;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load profile';
		} finally {
			loading = false;
		}

		// Continue loading remaining pages in background
		if (!feedDone) {
			loadMorePosts();
		}
	}

	async function loadMorePosts() {
		if (loadingMore || feedDone) return;
		loadingMore = true;

		try {
			const agent = createAgent();
			const result = await getPhotoPosts(agent, handle, feedCursor, 100);
			const newPosts = result.posts.filter(p => !seenUris.has(p.uri));
			for (const p of newPosts) seenUris.add(p.uri);
			if (newPosts.length > 0) posts = [...posts, ...newPosts];
			feedCursor = result.cursor;
			feedDone = !result.cursor;
		} catch {
			feedDone = true;
		} finally {
			loadingMore = false;
		}
	}

	function handleScroll() {
		if (feedDone || loadingMore) return;
		const scrollBottom = window.innerHeight + window.scrollY;
		const docHeight = document.documentElement.scrollHeight;
		if (docHeight - scrollBottom < 800) {
			loadMorePosts();
		}
	}

	function estimateApiCalls(): number {
		const d = $settings.crawlDepth;
		const apl = $settings.accountsPerLevel;
		// Rough estimate: each level fetches feeds + photo posts for each account
		// depth 0 = 1 feed scan, depth 1+ = apl accounts * 2 calls each (feed + photos)
		let total = 1;
		for (let i = 1; i <= d; i++) {
			total += apl * 2;
		}
		return total;
	}

	async function startCrawl() {
		const estimated = estimateApiCalls();
		if (estimated > 200) {
			const ok = confirm(
				`This crawl will make ~${estimated} API calls to Bluesky.\n\n` +
				`Bluesky rate limits are ~3,000 calls per 5 minutes. ` +
				`High usage may temporarily block your IP or account.\n\n` +
				`Depth: ${$settings.crawlDepth}, Accounts/level: ${$settings.accountsPerLevel}, Posts/account: ${$settings.postsPerAccount}\n\n` +
				`Continue?`
			);
			if (!ok) return;
		}

		crawlActive = true;
		crawlStatus = `Crawling depth 1...`;

		try {
			const agent = createAgent();

			for await (const event of crawlReposts(agent, handle, {
				maxDepth: Math.min($settings.crawlDepth, 5),
				accountsPerLevel: Math.min($settings.accountsPerLevel, 200),
				postsPerAccount: Math.min($settings.postsPerAccount, 500)
			})) {
				if (event.type === 'photos') {
					const newPosts = event.posts.filter((p: PhotoPost) => !seenUris.has(p.uri));
					for (const p of newPosts) seenUris.add(p.uri);
					if (newPosts.length > 0) posts = [...posts, ...newPosts];
				} else if (event.type === 'progress') {
					crawlStatus = `Depth ${event.depth} — ${event.accountsFound} accounts, ${event.photosFound} photos (${event.currentHandle})`;
				} else if (event.type === 'complete') {
					crawlStatus = `Done: ${event.totalAccounts} accounts, ${event.totalPhotos} photos`;
				} else if (event.type === 'error') {
					crawlStatus = `Error: ${event.message}`;
				}
			}
		} catch (err) {
			crawlStatus = `Error: ${err instanceof Error ? err.message : 'Crawl failed'}`;
		} finally {
			crawlActive = false;
		}
	}

	function onHideAccount(did: string) {
		hiddenDids = new Set([...hiddenDids, did]);
	}

	function onPhotoClick(post: PhotoPost, imageIndex: number) {
		selectedPost = post;
		selectedImageIndex = imageIndex;
	}
</script>

<svelte:window onscroll={handleScroll} />

{#if profile}
	<div class="profile-bar">
		<div class="profile-avatar">
			{#if profile.avatar}
				<img src={profile.avatar} alt="" />
			{:else}
				<span class="avatar-initials">{(profile.displayName || profile.handle).slice(0, 2).toUpperCase()}</span>
			{/if}
		</div>
		<div class="profile-info">
			<span class="profile-name">{profile.displayName || profile.handle}</span>
			<span class="profile-handle">@{profile.handle}</span>
		</div>
		<div class="profile-stats">
			<span class="stat">{formatCount(profile.postsCount)} posts</span>
			<span class="stat">{formatCount(profile.followsCount)} following</span>
			<span class="stat">{formatCount(profile.followersCount)} followers</span>
		</div>
		<div class="profile-spacer"></div>
		{#if $authState.isAuthenticated && $authState.did !== profile.did}
			<button
				class="follow-btn"
				class:following={!!followUri}
				onclick={handleFollow}
				disabled={followLoading}
				type="button"
			>
				{#if followLoading}
					...
				{:else if followUri}
					<span class="follow-label">Following</span>
					<span class="unfollow-label">Unfollow</span>
				{:else}
					Follow
				{/if}
			</button>
		{/if}
		<a
			href="https://bsky.app/profile/{profile.handle}"
			target="_blank"
			rel="noopener noreferrer"
			class="view-profile-btn"
		>View Profile</a>
	</div>
{/if}

<div class="mosaic-page">
	<DepthControl
		depth={$settings.crawlDepth}
		accountsPerLevel={$settings.accountsPerLevel}
		postsPerAccount={$settings.postsPerAccount}
		isActive={crawlActive}
		onCrawl={startCrawl}
		onDepthChange={(d) => updateSetting('crawlDepth', d)}
		onAccountsChange={(a) => updateSetting('accountsPerLevel', a)}
		onPostsChange={(p) => updateSetting('postsPerAccount', p)}
	/>

	{#if crawlStatus}
		<div class="crawl-status">{crawlStatus}</div>
	{/if}

	{#if loading}
		<div class="status">Loading photos...</div>
	{:else if error}
		<div class="status error">{error}</div>
	{:else if visiblePosts.length === 0}
		<div class="status">No photos found for this account.</div>
	{:else}
		<Mosaic posts={visiblePosts} {onPhotoClick} {onHideAccount} />
		{#if loadingMore}
			<div class="status loading-more">Loading more photos...</div>
		{/if}
	{/if}
</div>

{#if selectedPost}
	<PhotoModal
		post={selectedPost}
		imageIndex={selectedImageIndex}
		onclose={() => (selectedPost = null)}
	/>
{/if}

<style>
	.profile-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px 32px;
		background: var(--header-bg);
		border-bottom: 1px solid var(--border);
	}

	.profile-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--bg-muted);
		border: 1px solid var(--border);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.profile-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 600;
		color: var(--fg);
	}

	.profile-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.profile-name {
		font-family: 'Geist', sans-serif;
		font-size: 16px;
		font-weight: 600;
		color: var(--fg);
	}

	.profile-handle {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: var(--fg-subtle);
	}

	.profile-stats {
		display: flex;
		gap: 20px;
	}

	.stat {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: var(--fg-muted);
	}

	.profile-spacer {
		flex: 1;
	}

	.follow-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 600;
		color: #ffffff;
		padding: 10px 20px;
		border-radius: 9999px;
		border: none;
		background: var(--accent-purple);
		cursor: pointer;
		height: 40px;
		transition: background 0.2s;
	}

	.follow-btn:hover:not(:disabled) {
		background: var(--accent-purple-hover);
	}

	.follow-btn.following {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--fg-muted);
	}

	.follow-btn.following .unfollow-label {
		display: none;
	}

	.follow-btn.following:hover:not(:disabled) {
		border-color: #FF5C33;
		color: #FF5C33;
	}

	.follow-btn.following:hover:not(:disabled) .follow-label {
		display: none;
	}

	.follow-btn.following:hover:not(:disabled) .unfollow-label {
		display: inline;
	}

	.follow-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.view-profile-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 500;
		color: var(--accent-purple);
		text-decoration: none;
		padding: 10px 16px;
		border-radius: 9999px;
		border: 1px solid var(--border);
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		transition: background 0.2s;
	}

	.view-profile-btn:hover {
		background: var(--bg-muted);
	}

	.mosaic-page {
		flex: 1;
		background: var(--mosaic-bg);
	}

	.crawl-status {
		padding: 12px 24px;
		margin: 12px 24px;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--accent-purple);
		font-family: 'Geist Mono', monospace;
		font-size: 13px;
	}

	.status {
		text-align: center;
		padding: 3rem;
		color: var(--fg-dim);
		font-size: 1.1rem;
	}

	.status.error {
		color: #FF5C33;
	}

	.loading-more {
		padding: 1.5rem;
		font-size: 0.9rem;
		color: var(--fg-subtle);
	}

	@media (max-width: 768px) {
		.profile-bar {
			padding: 8px 16px;
			gap: 10px;
		}

		.profile-avatar {
			width: 28px;
			height: 28px;
		}

		.profile-info {
			flex-direction: row;
			align-items: center;
			gap: 6px;
		}

		.profile-name {
			font-size: 13px;
		}

		.profile-handle {
			font-size: 11px;
		}

		.profile-stats .stat:nth-child(1),
		.profile-stats .stat:nth-child(2) {
			display: none;
		}

		.profile-stats {
			gap: 0;
		}

		.stat {
			font-size: 11px;
		}

		.profile-spacer {
			display: none;
		}

		.follow-btn,
		.view-profile-btn {
			display: none;
		}
	}
</style>
