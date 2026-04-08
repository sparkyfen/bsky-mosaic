<script lang="ts">
</script>

<footer class="footer">
	<div class="footer-columns">
		<div class="footer-col description">
			<span class="col-title">BlueMosaic</span>
			<p class="col-desc">A Pinterest-style viewer for Bluesky photo posts. Browse, discover, and enjoy visual content from across the ATmosphere.</p>
		</div>
		<div class="footer-col">
			<span class="col-title">Legal</span>
			<a href="/terms">Terms of Service</a>
			<a href="/privacy">Privacy Policy</a>
			<a href="/cookies">Cookie Policy</a>
			<a href="/dmca">DMCA Notice</a>
		</div>
		<div class="footer-col">
			<span class="col-title">Bluesky</span>
			<a href="https://bsky.social" target="_blank" rel="noopener noreferrer">Bluesky Social</a>
			<a href="https://atproto.com" target="_blank" rel="noopener noreferrer">AT Protocol</a>
			<a href="https://bsky.social/about/support/community-guidelines" target="_blank" rel="noopener noreferrer">Community Guidelines</a>
			<a href="https://status.bsky.app" target="_blank" rel="noopener noreferrer">Status</a>
		</div>
		<div class="footer-col">
			<span class="col-title">Support</span>
			<a href="https://bsky.social/about/support" target="_blank" rel="noopener noreferrer">Help Center</a>
			<a href="https://github.com/sparkyfen/bsky-mosaic/issues" target="_blank" rel="noopener noreferrer">Report a Bug</a>
			<a href="https://github.com/sparkyfen/bsky-mosaic/issues" target="_blank" rel="noopener noreferrer">Feature Requests</a>
			<a href="mailto:contact@bluemosaic.app">Contact</a>
		</div>
	</div>
	<div class="footer-divider"></div>
	<div class="footer-bottom">
		<p class="copyright">&copy; 2026 BlueMosaic. Bluesky and the Bluesky logo are trademarks of Bluesky Social PBC. Not affiliated with Bluesky Social PBC.</p>
		<p class="made-with">Made with &hearts; from Claude</p>
	</div>
</footer>

<style>
	.footer {
		background: var(--bg-card);
		padding: 40px 32px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.footer-columns {
		display: flex;
		gap: 40px;
	}

	.footer-col {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.footer-col.description {
		flex: 1;
	}

	.col-title {
		font-family: 'Geist', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--fg);
	}

	.col-desc {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-muted);
		line-height: 1.5;
	}

	.footer-col a {
		font-family: 'Geist', sans-serif;
		font-size: 13px;
		color: var(--fg-muted);
		text-decoration: none;
		transition: color 0.15s;
	}

	.footer-col a:hover {
		color: var(--fg);
	}

	.footer-divider {
		height: 1px;
		background: var(--border);
	}

	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.copyright {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		color: var(--fg-subtle);
		line-height: 1.4;
		flex: 1;
	}

	.made-with {
		font-family: 'Geist', sans-serif;
		font-size: 12px;
		color: var(--fg-subtle);
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.footer-columns {
			flex-direction: column;
			gap: 24px;
		}

		.footer-bottom {
			flex-direction: column;
			gap: 8px;
			text-align: center;
		}
	}
</style>
