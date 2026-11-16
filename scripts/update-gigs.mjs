#!/usr/bin/env node
/**
 * Paid AI training gigs (micro1, Mercor) from JobDataLake, baked into static HTML
 * the same way scripts/update-jobs.mjs bakes the jobs rail:
 *
 *   - /paid-ai-work      the full list, generated whole (paid-ai-work.html)
 *   - a gigs rail        three coding gigs under the jobs rail on the top five pages
 *
 *   node scripts/update-gigs.mjs            # fetch live, snapshot to gigs.json, render
 *   node scripts/update-gigs.mjs --offline  # re-render from the existing gigs.json
 *
 * These are referral listings. Every apply link is the job's JDL `url`, which for a
 * sponsored job is https://echojobs.io/go/j/<token>: EchoJobs resolves the token to
 * our referral link and logs the click (channel = referrer origin, so base64.dev
 * shows up as its own channel). The referral link itself never appears here. A job
 * whose url is anything else is dropped, so an unauthenticated or changed API can
 * never publish a plain link.
 *
 * Needs JDL_API_KEY: without it JDL strips `url`. Daily refresh: jobs-refresh.yml.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- gigs-rail:start -->';
const END = '<!-- gigs-rail:end -->';
const AFTER = '<!-- jobs-rail:end -->';

const API = 'https://api.jobdatalake.com/v1/jobs';
const REDIRECT = 'https://echojobs.io/go/j/';
const PAGE = 'paid-ai-work.html';
const PAGE_URL = 'https://base64.dev/paid-ai-work';
const RAIL_SLOTS = 3;
/* Below this many usable gigs something upstream is wrong; keep yesterday's page. */
const MIN_GIGS = 50;

const PARTNERS = [
  { domain: 'micro1.ai', name: 'micro1' },
  { domain: 'work.mercor.com', name: 'Mercor' },
];

/* Pages that carry the jobs rail; the gigs rail goes right under it. */
const RAIL_PAGES = [
  { file: 'index.html', campaign: 'home' },
  { file: 'base64-to-pdf.html', campaign: 'base64-to-pdf' },
  { file: 'base64-to-image.html', campaign: 'base64-to-image' },
  { file: 'pdf-to-base64.html', campaign: 'pdf-to-base64' },
  { file: 'base64-to-excel.html', campaign: 'base64-to-excel' },
];

/* Sections on the page, in order. The audience is developers, so code comes first. */
const SECTIONS = [
  { id: 'software', title: 'Software, data & security', fns: ['eng', 'data', 'security', 'it', 'design', 'product'] },
  { id: 'science', title: 'Science & healthcare', fns: ['science', 'healthcare'] },
  { id: 'law-finance', title: 'Law, finance & business', fns: ['legal', 'finance', 'sales', 'marketing', 'ops', 'hr', 'admin', 'support'] },
  { id: 'other', title: 'Languages, writing & everything else', fns: [] },
];
const CODING = new Set(SECTIONS[0].fns);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cleanTitle = (t) => t.replace(/\s*\((?:remote|hybrid)\)\s*$/i, '').trim();

/* JDL salaries are yearly thousands USD; lotsofjobs stores an hourly rate as rate x 2080.
 * Mercor rates are hourly whatever the employment type says. micro1 full-time roles
 * (its own internal hires) carry real yearly salaries. */
function pay(j, partner) {
  const lo = Number(j.salary_min_usd) || 0;
  const hi = Number(j.salary_max_usd) || lo;
  if (!hi) return { label: '', sort: 0 };
  const hourly = partner === 'Mercor' || j.employment_type !== 'full_time';
  if (hourly) {
    const h = (k) => Math.round((k * 1000) / 2080);
    const a = h(lo || hi), b = h(hi);
    return { label: a === b ? `$${b}/hr` : `$${a}–${b}/hr`, sort: b };
  }
  return { label: lo && lo !== hi ? `$${lo}k–${hi}k/yr` : `$${hi}k/yr`, sort: Math.round((hi * 1000) / 2080) };
}

async function fetchPartner(key, { domain, name }) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const qs = new URLSearchParams({ q: '*', domain, sort_by: 'posted_at:desc', per_page: '100', page: String(page) });
    const res = await fetch(`${API}?${qs}`, { headers: { 'X-API-Key': key } });
    if (!res.ok) throw new Error(`JDL ${domain} page ${page}: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const jobs = data.jobs || [];
    for (const j of jobs) {
      if (!j.title || typeof j.url !== 'string' || !j.url.startsWith(REDIRECT)) continue;
      const p = pay(j, name);
      out.push({
        title: cleanTitle(j.title),
        partner: name,
        fn: j.job_function || 'other',
        type: j.employment_type || 'contract',
        pay: p.label,
        hourly: p.sort,
        skills: (j.required_skills || []).slice(0, 3),
        url: j.url,
      });
    }
    if (jobs.length < 100 || page * 100 >= (data.found || 0)) break;
  }
  return out;
}

async function fetchGigs() {
  const key = process.env.JDL_API_KEY;
  if (!key) throw new Error('JDL_API_KEY is not set. Without it JDL strips every url.');
  const gigs = [];
  for (const p of PARTNERS) {
    const got = await fetchPartner(key, p);
    console.log(`  ${p.name}: ${got.length} gigs`);
    gigs.push(...got);
  }
  if (gigs.length < MIN_GIGS) throw new Error(`only ${gigs.length} usable gigs (min ${MIN_GIGS}) — not refreshing`);
  /* Same token twice would be a double listing. */
  const seen = new Set();
  const unique = gigs.filter((g) => !seen.has(g.url) && seen.add(g.url));
  return {
    _comment: 'Generated by scripts/update-gigs.mjs — do not hand-edit; re-run the script.',
    updated: new Date().toISOString().slice(0, 10),
    gigs: unique,
  };
}

const byPay = (a, b) => b.hourly - a.hourly || a.title.localeCompare(b.title);

function item(g, extraMeta = '') {
  const meta = [g.partner, 'Remote', g.skills.join(' · '), extraMeta].filter(Boolean).join(' · ');
  return `      <a class="jobs-item" href="${esc(g.url)}" target="_blank" rel="sponsored noopener">
        <span class="jobs-main">
          <span class="jobs-title">${esc(g.title)}</span>
          <span class="jobs-meta">${esc(meta)}</span>
        </span>
        <span class="jobs-pay">${esc(g.pay)}</span>
      </a>`;
}

/* Three hourly coding gigs, highest paid first, alternating partners so neither fills
 * the rail. Yearly-salaried rows are micro1's own staff hires ("Director of
 * Engineering"), not gig work, so they stay on the page but off the rail. */
function railPicks(gigs) {
  const coding = gigs.filter((g) => CODING.has(g.fn) && g.pay.endsWith('/hr')).sort(byPay);
  const picks = [];
  const used = new Set();
  for (const partner of [...PARTNERS.map((p) => p.name), ...PARTNERS.map((p) => p.name)]) {
    const g = coding.find((x) => x.partner === partner && !used.has(x.url));
    if (g && picks.length < RAIL_SLOTS) { picks.push(g); used.add(g.url); }
  }
  for (const g of coding) {
    if (picks.length >= RAIL_SLOTS) break;
    if (!used.has(g.url)) { picks.push(g); used.add(g.url); }
  }
  return picks.sort(byPay);
}

function renderRail(data, campaign) {
  const picks = railPicks(data.gigs);
  const all = `/paid-ai-work?utm_source=base64.dev&utm_medium=gigs-rail&utm_campaign=${encodeURIComponent(campaign)}`;
  return `    ${START}
    <section class="jobs-rail" aria-label="Paid AI training work">
      <div class="jobs-rail-head">
        <span class="jobs-rail-label">Paid AI coding work</span>
        <span class="jobs-rail-by">referral links</span>
      </div>
      <div class="jobs-list">
${picks.map((g) => item(g)).join('\n')}
      </div>
      <a class="jobs-rail-foot" href="${esc(all)}">See all ${data.gigs.length} paid AI gigs &rarr;</a>
    </section>
    ${END}`;
}

function renderPage(data) {
  const sections = SECTIONS.map((s, i) => {
    const claimed = new Set(SECTIONS.slice(0, i).flatMap((x) => x.fns));
    const rows = data.gigs
      .filter((g) => (s.fns.length ? s.fns.includes(g.fn) : !SECTIONS.some((x) => x.fns.includes(g.fn))) && !claimed.has(g.fn))
      .sort(byPay);
    if (!rows.length) return '';
    return `      <h2 id="${s.id}">${esc(s.title)} <span class="gig-count">${rows.length}</span></h2>
      <section class="jobs-rail gigs-list" aria-label="${esc(s.title)}">
        <div class="jobs-list">
${rows.map((g) => item(g, g.type === 'full_time' ? 'Full-time' : '')).join('\n')}
        </div>
      </section>`;
  }).filter(Boolean).join('\n\n');

  const n = data.gigs.length;
  const desc = `${n} remote, paid AI training gigs for developers and domain experts: code review, evaluations, and expert data work at micro1 and Mercor. Updated daily.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Paid AI Training Work for Developers (${n} Remote Gigs) — base64.dev</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${PAGE_URL}">
<meta property="og:type" content="website">
<meta property="og:url" content="${PAGE_URL}">
<meta property="og:title" content="Paid AI training work for developers">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://base64.dev/og-image.png">
<meta property="og:site_name" content="base64.dev">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://base64.dev/" },
    { "@type": "ListItem", "position": 2, "name": "Paid AI work", "item": "${PAGE_URL}" }
  ]
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/articles/style.v2.css">
<link rel="stylesheet" href="/tools.css">
<style>
.gig-count { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--text-tertiary); margin-left: 6px; }
.gigs-list { margin-top: 12px; }
.gig-toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 8px; }
.gig-toc a { font-family: var(--font-mono); font-size: 12px; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-lg); text-decoration: none; color: var(--text-secondary); }
.gig-toc a:hover { color: var(--accent); }
.disclosure { font-size: 13px; color: var(--text-tertiary); }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="header-row">
      <a href="/" class="logo" aria-label="base64.dev home"><span class="logo-name">base64<span class="logo-tld">.dev</span></span></a>
      <div class="header-actions">
        <button class="icon-btn" id="themeBtn" title="Toggle theme" aria-label="Toggle light/dark theme">◑</button>
      </div>
    </div>
  </header>
  <main>
    <div class="breadcrumb">
      <a href="/">Home</a><span class="breadcrumb-sep">/</span>
      <span>Paid AI work</span>
    </div>

    <article class="article">
      <div class="article-meta">
        <span class="article-tag">Updated ${esc(data.updated)}</span>
      </div>
      <h1>Paid AI training work for developers</h1>
      <p class="lead">AI labs pay engineers and domain experts by the hour to write and review code, grade model answers, and build evaluation data. These are ${n} open, remote roles at micro1 and Mercor, refreshed daily.</p>

      <p>Most of these are contract work you can do alongside a day job. The usual process is an application, a short AI-led interview, then a matched project. Pay shown is the posted range.</p>

      <p class="disclosure">These are referral links: base64.dev may earn a referral fee if you sign up and get matched to a project. It costs you nothing, and the roles, pay and process are the same as applying directly. base64.dev is not affiliated with micro1 or Mercor.</p>

      <nav class="gig-toc" aria-label="Sections">
${SECTIONS.map((s) => `        <a href="#${s.id}">${esc(s.title)}</a>`).join('\n')}
      </nav>

${sections}
    </article>
  </main>
</div>
<footer>
  <div class="container">
    <div class="footer-row">
      <span>© 2026 base64.dev</span>
      <nav class="footer-links" aria-label="Footer navigation">
        <a href="/">Tool</a>
        <a href="/tools">Tools</a>
        <a href="/articles">Articles</a>
        <a href="/paid-ai-work">Paid AI work</a>
        <a href="/about">About</a>
      </nav>
    </div>
  </div>
</footer>
<script>
try { if (localStorage.getItem('base64dev-theme') === 'light') document.documentElement.classList.add('light'); } catch(e) {}
document.getElementById('themeBtn').addEventListener('click', function() {
  document.documentElement.classList.toggle('light');
  try { localStorage.setItem('base64dev-theme', document.documentElement.classList.contains('light') ? 'light' : 'dark'); } catch(e) {}
});
</script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

const offline = process.argv.includes('--offline');
const snapshot = join(ROOT, 'gigs.json');

let data;
if (offline) {
  data = JSON.parse(readFileSync(snapshot, 'utf8'));
  console.log(`offline: rendering from gigs.json (updated ${data.updated})`);
} else {
  data = await fetchGigs();
  writeFileSync(snapshot, JSON.stringify(data, null, 2) + '\n');
  console.log(`fetched ${data.gigs.length} gigs`);
}

let changed = 0;
const pagePath = join(ROOT, PAGE);
const page = renderPage(data);
let before = '';
try { before = readFileSync(pagePath, 'utf8'); } catch {}
if (page !== before) { writeFileSync(pagePath, page); changed++; console.log(`  ✓ ${PAGE}`); }

for (const { file, campaign } of RAIL_PAGES) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  const block = renderRail(data, campaign);
  let out;
  if (src.includes(START) && src.includes(END)) {
    out = src.replace(new RegExp(`[ \\t]*${START}[\\s\\S]*?${END}`), block);
  } else {
    const at = src.indexOf(AFTER);
    if (at === -1) { console.error(`  !! ${file}: no jobs rail to sit under, skipped`); continue; }
    const cut = at + AFTER.length;
    out = src.slice(0, cut) + '\n' + block + src.slice(cut);
  }
  if (out !== src) { writeFileSync(path, out); changed++; console.log(`  ✓ ${file}`); }
}

console.log(`\n${changed} file(s) updated`);
