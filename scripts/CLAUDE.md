# scripts/ — baked rails and stats

## Purpose

Node scripts (no dependencies, Node 22 in CI) that bake live data into static HTML, plus one stats puller.
`update-jobs.mjs` and `update-gigs.mjs` pull from the JobDataLake API (`/v1/jobs`) and rewrite marked blocks in
committed pages. The daily workflow `.github/workflows/jobs-refresh.yml` runs both and commits what changed; that
commit is a production deploy. Read the header comment of each script before editing it.

## Files

- `update-jobs.mjs`: the EchoJobs jobs rail (3 listings) on the five pages in `TARGETS`. Snapshot in
  `jobs.json`. Filters by pay (150k–600k, no flat bands, spread ≤ 2.5×), IC seniority, and drops aggregators.
  Also copies the rail CSS from `tools.css` into `index.html`'s `<style>` block.
- `update-gigs.mjs`: paid AI training gigs (micro1, Mercor). Writes `gigs.json`, the whole of
  `paid-ai-work.html`, and a 3-gig rail directly above the jobs rail on the pages in `RAIL_PAGES`.
- `bing-rank.mjs`: Bing Webmaster rank and traffic, top queries, top pages for a site URL. Reads
  `BING_WEBMASTER_API_KEY` from the environment or `.env.local`. Read-only.

## Rules

- Only `https://echojobs.io/go/j/<token>` links are published for gigs. `fetchPartner` drops every job whose
  `url` does not start with that prefix. Never loosen this or build a link from another field (2026-11-16).
- The API key is required: without `JDL_API_KEY` the API strips `url` (gigs) and `company_name` / `job_handle`
  (jobs). Both scripts throw when it is unset, so an unauthenticated run cannot publish an empty page.
- Empty is an error, not a result. `update-gigs` refuses below `MIN_GIGS = 50`; `update-jobs` refuses when fewer
  than 3 listings survive. Yesterday's page stays. Keep these floors.
- Generated blocks sit between `<!-- jobs-rail:start/end -->` and `<!-- gigs-rail:start/end -->`. Do not
  hand-edit them, `jobs.json`, `gigs.json` or `paid-ai-work.html`; change the script and re-run.
- Rail CSS is edited only in `tools.css` (between the `jobs-rail-css` markers); `index.html` gets a fresh copy
  each run. A hand-copied version once shipped unstyled.
- A new rail page goes into `TARGETS` / `RAIL_PAGES` and into the workflow's `git add` list, which names exact
  files. Miss the list and the page's change is never committed.

## Gotchas

- The workflow pipes each script through `tee` and does not set `shell: bash`, so there is no `pipefail`: a
  script's non-zero exit is masked and the commit step still runs **[check]**. The scripts throw before
  writing, so a failed run leaves its files unchanged rather than empty.
- A page without a jobs rail is skipped by `update-gigs` with a warning, not an error.
- Pay labels: salaries come as yearly thousands USD, and hourly rates are stored as rate × 2080. A gig is shown
  as hourly when it is Mercor or not `full_time`. Show no number the data does not carry; an empty label is fine.

## Tests

No test suite. Re-render without network or key: `node scripts/update-gigs.mjs --offline` and
`node scripts/update-jobs.mjs --offline` (they read the committed `gigs.json` / `jobs.json`). Then
`git diff` the HTML and check `grep -c 'go/j/' paid-ai-work.html` stays the same order of magnitude
(714 on 2026-11-27).
