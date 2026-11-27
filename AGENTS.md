# base64.dev

## What this is

base64.dev is a free Base64 encoder/decoder that runs in the browser, plus ~117 static pages: tools, converters,
per-language pages and articles (sitemap count, 2026-11-27). One committed HTML page per real search query,
JSON-LD on every page, `llms.txt`, and a daily IndexNow push. Most traffic comes from Bing, DuckDuckGo and
ChatGPT, not Google (about 90% of attributable referrers were Bing + DuckDuckGo, Vercel Analytics 2026-08-13).
Status: **maintenance** (fixes, cost and safety work; nothing speculative). Metrics: organic visits and clicks on
the gig links. Five pages carry a daily-baked EchoJobs jobs rail and a micro1/Mercor gigs rail; `/paid-ai-work`
lists every gig. Both are baked from the JobDataLake API. Nothing depends on this repo.

## Commands

- No `package.json`, no build step, no test suite. Pages are hand-written or script-baked HTML, served as-is.
- Preview: `python3 -m http.server 8123` from the repo root and open `/<page>.html` (Vercel `cleanUrls` drops
  `.html` only in production).
- Re-render the rails without the network: `node scripts/update-gigs.mjs --offline` and
  `node scripts/update-jobs.mjs --offline`.
- Bing stats: `node scripts/bing-rank.mjs` (reads `BING_WEBMASTER_API_KEY` from `.env.local`).
- Before a push, for every changed page: every `application/ld+json` block parses (a `json.loads` loop; 7 broken
  FAQ blocks were found this way 2026-06-17; 0 broken on 2026-11-27), inline JS passes `node --check`, every
  element id the JS uses exists in the HTML, internal links resolve (`/foo` is `foo.html`), the canonical is
  unique across the site, and the page was opened once in a browser.

## Deploy and verify

- Push to `main` (gaomengen/base64) → Vercel project `base64` (git-linked) → base64.dev. Builds take seconds;
  the whole deploy is under a minute. Deploy only by pushing; never with the Vercel CLI. Every branch also gets a
  preview URL.
- The `vercel.json` cron hits `/api/indexnow` daily at 06:00 UTC and submits the whole sitemap.
- GitHub Actions run here: `jobs-refresh.yml` is scheduled for 05:00 UTC but has fired between 13:00 and 15:40
  UTC (12 of the last 12 runs). It re-bakes both rails and pushes a bot commit when the output changed; that push
  deploys. `seo-stats.yml` (Mondays 13:00 UTC) needs the `BING_WEBMASTER_API_KEY` repo secret, which is not set, so
  it runs green and does nothing (2026-11-27).
- Verify: `curl -s https://base64.dev/<page>` returns 200 (checked 2026-11-27). Open the page you changed; for
  rails, `grep -c 'go/j/' paid-ai-work.html` should stay in the same range (714 on 2026-11-27).

## Map

- `index.html` (self-contained; inlines its CSS) and `*.html` at root: tools and converters. `tools.html` is the hub.
- `tools.css` / `tools.js`: the shared tool template and `window.B64` helpers. New tool pages reuse them.
- `articles/`: 39 HTML pages (38 articles + index). See `articles/CLAUDE.md`.
- `llms.txt`, `sitemap.xml`, `robots.txt`: hand-maintained; every new page goes into all three.
- `scripts/update-jobs.mjs`: jobs rail → `jobs.json` + 5 pages. `scripts/update-gigs.mjs`: gigs → `gigs.json`,
  `paid-ai-work.html` and the gigs rail. See `scripts/CLAUDE.md`.
- `api/indexnow.js`: IndexNow submit. The key file `9e97d91a….txt` at root is public by design.
- `vendor/`: the MIT `qrcode-generator` used by `base64-to-qr.html`.
- `docs/`: `STRATEGY.md`, `competitive-teardown-and-plan.md`, `ecosystem-roadmap.md`, `BUILDERS-PLAYBOOK.md`,
  `bing-indexnow-setup.md`, promotion and syndication drafts.

## Data and secrets

- Reads JobDataLake `GET /v1/jobs` only. Writes no database.
- `JDL_API_KEY`: GitHub Actions secret (set 2026-10-02). Not in `.env.local`.
- `BING_WEBMASTER_API_KEY`: `.env.local` only (gitignored).
- `CRON_SECRET`: optional Vercel env var checked by `/api/indexnow`.
- `bing-data/` (Bing CSV exports) is gitignored.

## Rules for this repo

- Gig links are `https://echojobs.io/go/j/<token>`; job links are plain echojobs.io URLs. Never a partner's own
  URL. `update-gigs.mjs` drops any other `url`; keep that filter (2026-11-16).
- Do not hand-edit `gigs.json`, `jobs.json`, `paid-ai-work.html` or the marked rail blocks. Edit the script and
  re-run it; the next daily run overwrites hand edits.
- Static only: no client-side fetch for rails. Baked rails are what crawlers see, and visitors pay nothing.
- Never add a `package.json` with a `build` script. Vercel would run it and the deploy would fail; the "build"
  here is committed HTML (this bit a sibling site).
- New pages only for demand mined from search autocomplete with a weak results page (`docs/STRATEGY.md`). No
  per-word `/enc/{word}` pages and no `base64-decode-{lang}` duplicates of the encode pages.
- When several pages are built at once, each builder edits only its own page; `sitemap.xml`, `tools.html`,
  `llms.txt` and cross-links are updated centrally afterwards.

## Gotchas

- The bot commits daily, so local `main` falls behind (11 commits on 2026-11-27). `git pull --rebase` before you
  commit and before you push, or the push is rejected.
- `index.html` links no external CSS: `update-jobs.mjs` copies the rail CSS from `tools.css` into it on each run
  (a hand copy once shipped unstyled). Edit rail styles in `tools.css` only.
- Vercel Analytics counts the owner's own search clicks as `google.com` referrals; Bing Webmaster and Search
  Console are the source of truth for organic traffic (2026-07-12).
- `vercel.json` still sets a cache header for `/articles/style.css`, which no page links any more; pages use
  `style.v2.css`.

## Decisions in force

- 2026-11-16: the gigs rail sits above the jobs rail with no "referral links" label. `/paid-ai-work` keeps a
  disclosure paragraph that says base64.dev "may earn a referral fee". **[check]** whether that wording stays.
- 2026-07-16: no `/enc/{word}` dictionary pages; autocomplete mining showed demand is formats and contexts.
- 2026-06-17: robots.txt welcomes search and AI crawlers, disallows SEO spiders, Amazonbot, Bytespider, PetalBot
  and Sogou.

## Pointers

- `docs/BUILDERS-PLAYBOOK.md` and `docs/STRATEGY.md` (how pages are chosen and built).
- `docs/bing-indexnow-setup.md` (Bing Webmaster and IndexNow).
