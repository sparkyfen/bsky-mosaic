<div class="legal">
	<h1>Privacy Policy</h1>
	<p class="updated">Last updated: April 7, 2026</p>

	<h2>1. Overview</h2>
	<p>BlueMosaic is committed to protecting your privacy. This policy explains what information we handle and how.</p>

	<h2>2. Data We Do Not Collect</h2>
	<p>BlueMosaic does not operate any backend data collection. We do not collect, store, or transmit:</p>
	<ul>
		<li>Personal information or identifying data</li>
		<li>Usage analytics or tracking data</li>
		<li>Login credentials or authentication tokens</li>
		<li>Browsing history or search queries</li>
	</ul>

	<h2>3. Local Storage</h2>
	<p>BlueMosaic stores the following data locally in your browser using localStorage:</p>
	<ul>
		<li><strong>Theme preference</strong> — your light/dark mode selection</li>
		<li><strong>Session tokens</strong> — if you sign in with Bluesky, your access and refresh tokens are stored locally to maintain your session. These are never sent to BlueMosaic servers.</li>
	</ul>
	<p>You can clear this data at any time through your browser settings or by logging out.</p>

	<h2>4. API Requests</h2>
	<p>All requests to the Bluesky API are made directly from your browser to the Bluesky public API (<code>public.api.bsky.app</code>) or Bluesky Social (<code>bsky.social</code>) for authenticated requests. BlueMosaic servers do not proxy, log, or inspect these requests.</p>

	<h2>5. Third-Party Services</h2>
	<p>BlueMosaic uses:</p>
	<ul>
		<li><strong>Google Fonts</strong> — to load typefaces. Google may collect anonymous usage data per their <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</li>
		<li><strong>Bluesky API</strong> — governed by Bluesky's own <a href="https://bsky.social/about/support/privacy-policy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</li>
	</ul>

	<h2>6. Content Filtering Preferences</h2>
	<p>Your content filtering preferences (e.g., NSFW content visibility) are stored locally in your browser via localStorage. These preferences are never transmitted to any server. Content labels used for filtering are provided by the Bluesky content moderation system.</p>

	<h2>7. Age Requirement and Children's Privacy</h2>
	<p>BlueMosaic requires users to be at least 18 years of age. The Service is not directed at children under 13 in compliance with the Children's Online Privacy Protection Act (COPPA), nor at minors under 18 due to the potential presence of mature content. We do not knowingly collect information from children or minors. The site is labeled as age-18 under the German Youth Protection Program (age.xml).</p>

	<h2>8. Changes to This Policy</h2>
	<p>We may update this policy from time to time. Changes will be reflected by the "Last updated" date above.</p>

	<h2>9. Contact</h2>
	<p>For privacy-related questions, contact us at <a href="mailto:contact@tiles.blue">contact@tiles.blue</a>.</p>
</div>

<style>
	.legal {
		max-width: 720px;
		margin: 0 auto;
		padding: 48px 32px;
		color: var(--fg);
	}

	h1 {
		font-family: 'Geist', sans-serif;
		font-size: 28px;
		font-weight: 700;
		margin-bottom: 8px;
	}

	.updated {
		font-family: 'Geist Mono', monospace;
		font-size: 13px;
		color: var(--fg-subtle);
		margin-bottom: 32px;
	}

	h2 {
		font-family: 'Geist', sans-serif;
		font-size: 18px;
		font-weight: 600;
		margin-top: 28px;
		margin-bottom: 8px;
	}

	p, li {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		color: var(--fg-muted);
		line-height: 1.6;
	}

	ul {
		padding-left: 24px;
		margin-top: 8px;
	}

	li {
		margin-bottom: 4px;
	}

	a {
		color: var(--accent-purple);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}

	code {
		font-family: 'Geist Mono', monospace;
		font-size: 13px;
		background: var(--bg-muted);
		padding: 2px 6px;
		border-radius: 4px;
	}
</style>
