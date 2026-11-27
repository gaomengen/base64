# base64.dev

## What this is

base64.dev: a free, client-side Base64 encoder/decoder plus ~117 static tool, converter, per-language and article
pages (sitemap count, 2026-11-27). It follows the tool-site AEO playbook in `~/code/PLAYBOOK.md`: one real tool that runs in the
browser, one committed HTML page per real query, JSON-LD on every page, `llms.txt`, IndexNow pushed daily. It
targets Bing, DuckDuckGo and ChatGPT, not Google (about 80% of attributable referrers were Bing+DDG, Vercel Analytics 2026-08-13).
Role: **maintain**. Metrics: organic visits, and gig clicks (`/go/j` clicks logged by EchoJobs with
`channel: "base64.dev"`). It is the only tool site that links out to the job network: a daily-baked EchoJobs
jobs rail and a micro1/Mercor gigs rail on five pages, plus the full `/paid-ai-work` list. Both are baked from
the JDL API. Nothing depends on this repo.

## Commands

- No `package.json`, no build, no tests. Pages are hand-written or script-baked HTML, served as-is.
- Preview: `python3 -m http.server 8123` and open `/<page>.html` (Vercel `cleanUrls` drops `.html` only in production).
- Re-render rails without the network: `node scripts/update-gigs.mjs --offline` and `node scripts/update-jobs.mjs --offline`.
- Bing stats: `node scripts/bing-rank.mjs` (reads `BING_WEBMASTER_API_KEY` from `.env.local`).
- Before a push: validate every `application/ld+json` block parses (a `json.loads` loop over all pages; 7 broken
  FAQ blocks were found this way 2026-06-17), and open each changed page once in a browser.

## Deploy and verify

- Push to `main` (gaomengen/base64) → Vercel project `base64` (team remotefront, git-linked) → base64.dev. A
  deploy takes ~20 s. The `vercel.json` cron hits `/api/indexnow` daily at 06:00 UTC and submits the whole sitemap.
- GitHub Actions **do run here** (personal repo): `jobs-refresh.yml` runs daily (05:00 UTC cron, it fires about
  13:00 to 15:30 UTC). It re-bakes both rails and pushes a bot commit when the output changed, and each push deploys.
- Verify: `curl -s https://base64.dev/<page>` works (no WAF challenge on this site, 2026-11-27); check the page
  you changed, and for rails count `go/j/` links in `/paid-ai-work` (714 on 2026-11-27).

## Map

- `index.html` (self-contained, inlines its CSS), `*.html` at root: tools and converters; `tools.html` is the hub.
- `tools.css` / `tools.js`: shared tool template and `window.B64` helpers; new tool pages reuse them.
- `articles/`: 39 HTML pages (guides + index); `articles/style*.css`. `llms.txt`, `sitemap.xml`, `robots.txt` are hand-maintained.
- `scripts/update-jobs.mjs`: EchoJobs jobs rail → `jobs.json` + 5 pages. `scripts/update-gigs.mjs`: gigs →
  `gigs.json`, `paid-ai-work.html`, gigs rail above the jobs rail. See `scripts/CLAUDE.md`.
- `api/indexnow.js`: IndexNow submit (key file `9e97d91a….txt` at root is public by design).
- `docs/`: `STRATEGY.md`, `competitive-teardown-and-plan.md`, `ecosystem-roadmap.md`, `BUILDERS-PLAYBOOK.md`.

## Data and secrets

- Reads JDL `GET /v1/jobs` only. Writes no database. Gig clicks land in EchoJobs' `sponsored_clicks` (Mongo
  `lotsof_jobs`) through `echojobs.io/go/j/<token>`.
- `JDL_API_KEY`: GitHub Actions secret (set 2026-10-02); not in `.env.local`.
- `BING_WEBMASTER_API_KEY`: `.env.local` only. Not a repo secret, so `seo-stats.yml` runs green and does nothing
  (2026-11-27).
- `CRON_SECRET`: optional, Vercel env; `/api/indexnow` is open without it (idempotent).
- `bing-data/` (Bing CSV exports) is gitignored.

## Rules for this repo

- Gig and rail links are `https://echojobs.io/go/j/<token>` or plain echojobs.io job URLs, never a partner
  referral URL. `update-gigs.mjs` drops any other `url`; keep that filter (2026-11-16, referral codes are revenue).
- Do not hand-edit `gigs.json`, `jobs.json`, `paid-ai-work.html` or the marked rail blocks; edit the script and
  re-run it. The next daily run overwrites hand edits.
- Static only: no client-side fetch for rails (rails are baked so crawlers see them and visitors pay nothing).
- New pages only for demand mined from autocomplete with a weak SERP (STRATEGY.md); no per-word `/enc/{word}`
  pages and no `base64-decode-{lang}` duplicates of the encode pages.

## Gotchas

- 2026-11-27: local `main` was 11 bot commits behind origin. Run `git pull --ff-only` before you start and before
  you commit, or the push is rejected.
- `index.html` links no external CSS: the rail CSS is copied into it from `tools.css` by `update-jobs.mjs` on
  each run (a hand copy once shipped unstyled). Edit rail styles in `tools.css` only.
- Vercel Analytics counts the operator's own search clicks as `google.com`; Bing Webmaster / GSC are the source
  of truth for organic (2026-07-12).
- `.claude/settings.local.json` allows `Bash(vercel:*)`; that does not make `vercel --prod` allowed.

## Decisions in force

- 2026-11-16: gigs rail sits above the jobs rail, no "referral links" label; `/paid-ai-work` keeps a disclosure
  paragraph that says base64.dev "may earn a referral fee". **[check]** against the 2026-11-19 no-fee-wording decision (echojobs/remotefront).
- 2026-06-17: robots.txt welcomes search and AI crawlers, disallows SEO spiders and Amazonbot.

## Pointers

- `~/code/PLAYBOOK.md` (site runbook; §12 demand mining, §13 authority flywheel).
- Memory: `~/.claude/projects/-Users-mengengao-code-base64/memory/` (traffic history, AEO infra, sibling sites).
- EchoJobs `/go/j`: `~/code/echojobs/frontend/src/app/go/`.
