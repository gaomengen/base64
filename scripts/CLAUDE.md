# scripts/: the JDL bakes

`update-jobs.mjs` (EchoJobs jobs rail) and `update-gigs.mjs` (micro1/Mercor gigs: `/paid-ai-work` + gigs rail)
pull from `https://api.jobdatalake.com/v1/jobs` and write static HTML. `jobs-refresh.yml` runs both daily and
commits what changed; that commit is a production deploy. Read the header comment of each script first.

## Invariants

- **Only `/go/j` tokens are public.** A gig's apply link is JDL's `url`, which for a sponsored job is
  `https://echojobs.io/go/j/<token>`. `fetchPartner` drops every job whose `url` does not start with that prefix.
  Never loosen this, never build a link from another field, never print or commit a partner referral URL
  (constitution red line). The `/go/j` route resolves the token and logs the click.
- **The key is load-bearing.** Without `JDL_API_KEY`, JDL strips `url` (gigs) and `company_name` / `job_handle`
  (jobs). Both scripts throw when the key is unset. An unauthenticated run would otherwise filter every gig out.
- **Empty is an error, not a result.** `update-gigs` refuses to refresh below `MIN_GIGS = 50` usable gigs;
  `update-jobs` refuses below 3 surviving listings. In both cases yesterday's page stays. Keep these floors; a 429
  or a depleted shared key must not publish an empty page.
- The gigs step in the workflow is `|| echo …`, so a gigs failure never blocks the jobs rail. The jobs step has no
  such guard, so a jobs failure skips the commit for both.
- Markers `<!-- gigs-rail:start/end -->` and `<!-- jobs-rail:start/end -->` delimit generated blocks. The gigs
  rail is inserted directly above the jobs rail; a page with no jobs rail is skipped with a warning.
- Rail CSS lives in `tools.css` between `jobs-rail-css` markers and is copied into `index.html` on every run.
- The workflow `git add` list names exact files. A new rail page must be added to `RAIL_PAGES`/`TARGETS` **and**
  to that list, or its change is never committed.

## Testing a change

- `node scripts/update-gigs.mjs --offline` / `update-jobs.mjs --offline` re-render from the committed snapshots,
  with no network and no key. Diff the HTML, then check `grep -c 'go/j/' paid-ai-work.html` is unchanged in
  order of magnitude (714 on 2026-11-27).
- A live run needs `JDL_API_KEY` in the environment, and only that variable. Do not load other secrets for it.
- Pay labels: JDL salaries are yearly thousands USD; hourly rates were stored as rate × 2080. Mercor is always
  hourly. Do not show a number the data does not carry; an empty label is fine.
