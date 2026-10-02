#!/usr/bin/env node
/**
 * Pulls live listings from JobDataLake and renders the EchoJobs rail into the
 * target pages. Runs at BUILD time, not request time: the rail ships as static
 * markup, so there is no client fetch, no layout shift, nothing for a blocker
 * to match, and no runtime dependency on the hot path.
 *
 *   node scripts/update-jobs.mjs            # fetch live, snapshot to jobs.json, render
 *   node scripts/update-jobs.mjs --offline  # re-render from the existing jobs.json
 *
 * Needs JDL_API_KEY. /v1/jobs answers without one, but company_name and
 * job_handle are gated — and a listing with no company and no link is not worth
 * showing. The daily refresh lives in .github/workflows/jobs-refresh.yml.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- jobs-rail:start -->';
const END = '<!-- jobs-rail:end -->';

const API = 'https://api.jobdatalake.com/v1/jobs';
const BOARD = 'https://echojobs.io';
const SLOTS = 3;

/* Salaries are in thousands USD. Sorting by pay surfaces almost nothing but
 * Netflix plus broken data, so the feed is sorted by recency and quality is
 * enforced here instead. Each rule earns its place against the live data:
 *
 *   bounds        — below 150k reads as weak, above 600k as fake
 *   flat bands    — lo === hi is a single posted number, not a range, and is
 *                   wrong far more often than not (Coinbase "$685k-685k" for a
 *                   Senior SWE; Remoteworld "$540k-540k" for a mid-level FE)
 *   spread cap    — Netflix posts "$90k-600k"; a 6x band is a parsing artifact
 *   IC seniority  — this audience is mid-debug engineers, not VPs
 *   aggregators   — reposters, not employers; nobody recognises the brand
 */
const PAY_FLOOR = 150;
const PAY_CEIL = 600;
const MAX_SPREAD = 2.5;
const IC_LEVELS = new Set(['Entry', 'Mid Level', 'Senior', 'Staff', 'Principal', 'Lead']);
const LEADERSHIP = /\b(director|vp|vice president|head of|chief|manager)\b/i;
const AGGREGATORS = new Set([
  'jobgether', 'jobs for humanity', 'remoteworld', 'g2i', 'crossover', 'turing', 'toptal',
]);

const TARGETS = [
  { file: 'index.html',           campaign: 'home',            anchor: /^[ \t]*<article class="seo-content">/m },
  { file: 'base64-to-pdf.html',   campaign: 'base64-to-pdf',   anchor: /^[ \t]*<h2>/m },
  { file: 'base64-to-image.html', campaign: 'base64-to-image', anchor: /^[ \t]*<h2>/m },
  { file: 'pdf-to-base64.html',   campaign: 'pdf-to-base64',   anchor: /^[ \t]*<h2>/m },
  { file: 'base64-to-excel.html', campaign: 'base64-to-excel', anchor: /^[ \t]*<h2>/m },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const utm = (url, campaign, content) => {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'base64.dev');
  u.searchParams.set('utm_medium', 'cross');
  u.searchParams.set('utm_campaign', campaign);
  u.searchParams.set('utm_content', content);
  return u.toString();
};

/* Titles arrive with a trailing "(Remote)" that the rail already says in the
 * meta line, and some carry a trailing location clause. */
const cleanTitle = (t) => t.replace(/\s*\((?:remote|hybrid|us|usa|onsite)\)\s*$/i, '').trim();

/* ATS exports carry entity suffixes nobody says out loud ("Talkspace Corporate"). */
const cleanCompany = (c) =>
  c.replace(/[,]?\s+(corporate|corp\.?|inc\.?|llc|ltd\.?|limited|gmbh|plc)$/i, '').trim();

async function fetchJobs() {
  const key = process.env.JDL_API_KEY;
  if (!key) {
    throw new Error('JDL_API_KEY is not set. Without it company_name and job_handle come back empty.');
  }

  const qs = new URLSearchParams({
    q: '*',
    job_function: 'eng',
    remote_type: 'fully_remote',
    sort_by: 'posted_at:desc',
    per_page: '100',
  });

  const res = await fetch(`${API}?${qs}`, { headers: { 'X-API-Key': key } });
  if (!res.ok) throw new Error(`JDL responded ${res.status} ${res.statusText}`);
  const data = await res.json();

  const seen = new Set();
  const picked = [];

  for (const j of data.jobs || []) {
    if (picked.length === SLOTS) break;

    if (!j.company_name || !j.job_handle || !j.title) continue;

    const lo = Number(j.salary_min_usd);
    const hi = Number(j.salary_max_usd);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    if (lo === hi) continue;
    if (lo < PAY_FLOOR || hi > PAY_CEIL || hi < lo) continue;
    if (hi / lo > MAX_SPREAD) continue;

    /* seniority is multi-valued and leaky — "Senior Director" carries both —
     * so the title gets a second look. */
    if (!(j.seniority || []).some((s) => IC_LEVELS.has(s))) continue;
    if (LEADERSHIP.test(j.title)) continue;

    const company = cleanCompany(j.company_name);
    if (AGGREGATORS.has(company.toLowerCase())) continue;

    /* One slot per company, or the rail turns into a Netflix careers page. */
    if (seen.has(company.toLowerCase())) continue;
    seen.add(company.toLowerCase());

    picked.push({
      title: cleanTitle(j.title),
      company,
      salary: `$${lo}k–${hi}k`,
      tags: (j.required_skills || []).slice(0, 3).join(' · '),
      url: `${BOARD}/job/${j.job_handle}`,
    });
  }

  if (picked.length < SLOTS) {
    throw new Error(`only ${picked.length}/${SLOTS} listings survived filtering — not refreshing`);
  }

  return {
    _comment: 'Generated by scripts/update-jobs.mjs — do not hand-edit; re-run the script.',
    updated: new Date().toISOString().slice(0, 10),
    totalJobs: data.found,
    boardUrl: `${BOARD}/`,
    jobs: picked,
  };
}

function render(data, campaign) {
  const items = data.jobs.map((j, i) => {
    const href = esc(utm(j.url, campaign, `job${i + 1}`));
    const meta = [j.company, 'Remote', j.tags].filter(Boolean).join(' · ');
    return `      <a class="jobs-item" href="${href}" target="_blank" rel="noopener">
        <span class="jobs-main">
          <span class="jobs-title">${esc(j.title)}</span>
          <span class="jobs-meta">${esc(meta)}</span>
        </span>
        <span class="jobs-pay">${esc(j.salary)}</span>
      </a>`;
  }).join('\n');

  /* Rounded down to the nearest thousand: a baked exact count is stale the
   * moment it ships, and "29,326" reads scraped where "29,000+" reads true. */
  const total = (Math.floor(Number(data.totalJobs) / 1000) * 1000).toLocaleString('en-US') + '+';
  const foot = esc(utm(data.boardUrl, campaign, 'footer'));
  const head = esc(utm(data.boardUrl, campaign, 'header'));

  return `    ${START}
    <section class="jobs-rail" aria-label="Remote engineering jobs">
      <div class="jobs-rail-head">
        <span class="jobs-rail-label">Remote dev jobs</span>
        <span class="jobs-rail-by">by <a href="${head}" target="_blank" rel="noopener">EchoJobs</a></span>
      </div>
      <div class="jobs-list">
${items}
      </div>
      <a class="jobs-rail-foot" href="${foot}" target="_blank" rel="noopener">Browse ${total} remote engineering jobs &rarr;</a>
    </section>
    ${END}`;
}

const offline = process.argv.includes('--offline');
const snapshot = join(ROOT, 'jobs.json');

let data;
if (offline) {
  data = JSON.parse(readFileSync(snapshot, 'utf8'));
  console.log(`offline: rendering from jobs.json (updated ${data.updated})`);
} else {
  data = await fetchJobs();
  writeFileSync(snapshot, JSON.stringify(data, null, 2) + '\n');
  console.log(`fetched ${data.jobs.length} listings from ${data.totalJobs.toLocaleString('en-US')} remote eng jobs`);
  for (const j of data.jobs) console.log(`  · ${j.company} — ${j.title} (${j.salary})`);
}

let changed = 0;
for (const { file, campaign, anchor } of TARGETS) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  const block = render(data, campaign);
  let out;

  if (src.includes(START) && src.includes(END)) {
    out = src.replace(new RegExp(`[ \\t]*${START}[\\s\\S]*?${END}`), block);
  } else {
    const m = src.match(anchor);
    if (!m) { console.error(`  !! ${file}: anchor not found, skipped`); continue; }
    out = src.slice(0, m.index) + block + '\n\n' + src.slice(m.index);
  }

  if (out !== src) { writeFileSync(path, out); changed++; console.log(`  ✓ ${file}`); }
}

console.log(`\n${changed} page(s) updated`);
