# BlueMosaic — Next Steps

## 1. Domain

### Recommended: `tiles.blue`

Other options considered:
- `mosaic.blue` — shortest, uses `.blue` TLD
- `bskymosaic.com` — ties to Bluesky clearly
- `bluemosaic.dev` — dev/tool vibe

### Where to register

- **Cloudflare Registrar** — at-cost pricing (no markup), free WHOIS privacy, pairs well with Cloudflare Pages hosting
- **Namecheap** — cheap first year, free WHOIS privacy
- **Google Domains** (now Squarespace) — straightforward, slightly pricier

### DNS setup

Once registered, point the domain to whichever hosting option you choose:
- **Cloudflare Pages** — add the domain in the Pages dashboard, it auto-configures DNS if registered through Cloudflare
- **Coolify/VPS** — create an A record pointing to your server's IP, set up SSL via Coolify's built-in Let's Encrypt
- **Vercel/Netlify** — add a CNAME record as instructed in their dashboard

---

## 2. Hosting Options

### Option A: Cloudflare Pages (recommended for public launch)

**Cost:** Free
**Pros:** Global CDN, automatic HTTPS, unlimited bandwidth, GitHub auto-deploys
**Cons:** Static only — requires switching from `adapter-node` to `adapter-static`

#### Setup steps

1. Switch the SvelteKit adapter:
   ```sh
   npm uninstall @sveltejs/adapter-node
   npm install -D @sveltejs/adapter-static
   ```

2. Update `svelte.config.js`:
   ```js
   import adapter from '@sveltejs/adapter-static';
   export default {
     kit: {
       adapter: adapter({ fallback: '200.html' })
     }
   };
   ```

3. Add `src/routes/+layout.ts`:
   ```ts
   export const prerender = false;
   export const ssr = false;
   ```

4. Push to GitHub

5. In the Cloudflare dashboard:
   - Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
   - Select `sparkyfen/bsky-mosaic`
   - Build command: `npm run build`
   - Output directory: `build`
   - Add environment variable: `NODE_VERSION` = `20`
   - Deploy

6. Add custom domain in Pages settings → Custom domains → `tiles.blue`

---

### Option B: Coolify on Mac Mini (recommended for now / development)

**Cost:** Free (self-hosted)
**Pros:** Full Docker support, keeps `adapter-node`, no vendor lock-in, good for dev/staging
**Cons:** Depends on Mac Mini uptime, need to handle SSL and port forwarding

#### Setup steps

1. Install Coolify on Mac Mini (if not already):
   ```sh
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

2. Access Coolify dashboard at `http://localhost:8000`

3. Add a new resource:
   - Source: GitHub → `sparkyfen/bsky-mosaic`
   - Build pack: Docker Compose
   - It will use the existing `docker-compose.yml` and `Dockerfile`

4. Configure domain:
   - Set the domain to `tiles.blue`
   - Enable Let's Encrypt for automatic SSL
   - Set up port forwarding on your router (80/443 → Mac Mini)

5. Deploy

---

### Option C: Vercel (easiest zero-config)

**Cost:** Free (hobby tier)
**Pros:** Zero-config SvelteKit support, auto-deploys from GitHub, preview deployments for PRs
**Cons:** Serverless cold starts, 100GB bandwidth/mo on free tier

#### Setup steps

1. Switch adapter:
   ```sh
   npm uninstall @sveltejs/adapter-node
   npm install -D @sveltejs/adapter-vercel
   ```

2. Update `svelte.config.js`:
   ```js
   import adapter from '@sveltejs/adapter-vercel';
   export default {
     kit: { adapter: adapter() }
   };
   ```

3. Push to GitHub

4. Go to [vercel.com](https://vercel.com), import `sparkyfen/bsky-mosaic`

5. It auto-detects SvelteKit — click Deploy

6. Add custom domain in project settings → Domains → `tiles.blue`

---

### Option D: Fly.io (cheap container hosting)

**Cost:** Free tier (3 shared VMs), then ~$2-5/mo
**Pros:** Keeps `adapter-node`, global edge deployment, simple Docker deploys
**Cons:** Free tier is limited, need `flyctl` CLI

#### Setup steps

1. Install flyctl:
   ```sh
   brew install flyctl
   fly auth login
   ```

2. Launch the app:
   ```sh
   cd bluesky-mosaic
   fly launch
   ```
   - It detects the Dockerfile automatically
   - Choose a region close to you
   - Skip the database prompt

3. Deploy:
   ```sh
   fly deploy
   ```

4. Add custom domain:
   ```sh
   fly certs add tiles.blue
   ```
   Then add the CNAME/A records shown to your DNS.

---

## 3. Recommended Path

| Phase | Hosting | Domain | Effort |
|-------|---------|--------|--------|
| **Now** | Coolify on Mac Mini | none (localhost) | Already done |
| **When ready to share** | Cloudflare Pages | `tiles.blue` via Cloudflare Registrar | ~30 min |
| **If you need server features later** | Fly.io or Coolify with public IP | same domain | ~1 hr |

---

## 4. Remaining App Features

From the original plan, still not started:

- [ ] **OAuth login** — replace app password flow with proper `@atproto/oauth-client-node` (more secure, no password handling)
- [ ] **Follows list** — when logged in, show followed accounts as entry points on the home page
- [ ] **Settings page** — wire up the Settings menu item (default crawl depth, accounts per level, posts per account)
- [ ] **Deduplication** — if an account is discovered through multiple repost paths, show the shortest path
- [ ] **Infinite scroll** — load more posts as the user scrolls instead of fetching all up front
- [ ] **Mobile responsiveness** — test and polish on smaller screens
- [ ] **Favicon** — replace the default SvelteKit favicon with a BlueMosaic icon
- [ ] **Open Graph meta tags** — for link previews when sharing
- [ ] **Error boundaries** — graceful error handling for API failures, rate limits
- [ ] **Export discovered accounts** — let users export a list of accounts they found
