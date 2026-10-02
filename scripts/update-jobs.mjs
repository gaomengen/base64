#!/usr/bin/env node
/**
 * Renders the EchoJobs cross-promo rail into the target pages from jobs.json.
 *
 * Idempotent: on first run it inserts the block at the page's anchor; on every
 * later run it replaces whatever sits between the markers. Re-run after editing
 * jobs.json to refresh the listings.
 *
 *   node scripts/update-jobs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- jobs-rail:start -->';
const END = '<!-- jobs-rail:end -->';

/* Each page gets its own utm_campaign so the Vercel UTM tab breaks CTR down per page. */
const TARGETS = [
  { file: 'index.html',           campaign: 'home',           anchor: /^[ \t]*<article class="seo-content">/m },
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

function render(data, campaign) {
  const items = data.jobs.map((j, i) => {
    const href = esc(utm(j.url, campaign, `job${i + 1}`));
    return `      <a class="jobs-item" href="${href}" target="_blank" rel="noopener">
        <span class="jobs-main">
          <span class="jobs-title">${esc(j.title)}</span>
          <span class="jobs-meta">${esc(j.company)} · Remote · ${esc(j.tags)}</span>
        </span>
        <span class="jobs-pay">${esc(j.salary)}</span>
      </a>`;
  }).join('\n');

  const total = Number(data.totalJobs).toLocaleString('en-US');
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

const data = JSON.parse(readFileSync(join(ROOT, 'jobs.json'), 'utf8'));
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
    if (!m) {
      console.error(`  !! ${file}: anchor not found, skipped`);
      continue;
    }
    out = src.slice(0, m.index) + block + '\n\n' + src.slice(m.index);
  }

  if (out !== src) {
    writeFileSync(path, out);
    changed++;
    console.log(`  ✓ ${file} (utm_campaign=${campaign})`);
  } else {
    console.log(`  = ${file} unchanged`);
  }
}

console.log(`\n${changed} file(s) updated · ${data.jobs.length} jobs · source: jobs.json`);
