# BlueMosaic — Next Steps

## Hosting

Currently deployed on **Cloudflare Pages** with `adapter-cloudflare`. Auto-deploys from GitHub via Actions.

- **Domain:** `tiles.blue` (registered via Spaceship, DNS on Cloudflare)
- **Pages project:** `bsky-mosaic`
- **Bluesky account:** [@tiles.blue](https://bsky.app/profile/tiles.blue)

---

## Remaining App Features

### Not started

- [ ] **Deduplication** — if an account is discovered through multiple repost paths, show the shortest path
- [ ] **Export discovered accounts** — let users export a list of accounts they found

### Settings to wire up later

These settings exist in the store but have no visual effect yet. They were removed from the settings UI to avoid confusion:

- **Sticky header** — make the header fixed on scroll
- **Reduce motion** — suppress hover animations and transitions
- **High contrast mode** — increase contrast for accessibility
- **Show alt text overlay** — display alt text on photo cards

### Design mockups to implement

- Settings page: NSFW as radio buttons, Age Verification & Adult Content section
- Mobile: empty home state, profile page, search typing experience
