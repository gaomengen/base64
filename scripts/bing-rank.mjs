#!/usr/bin/env node
// On-demand Bing Webmaster Tools stats puller for base64.dev.
// Reads BING_WEBMASTER_API_KEY from .env.local (gitignored) or the environment.
// Pulls Rank & Traffic, top Queries, and top Pages from the BWT JSON API.
//
//   node scripts/bing-rank.mjs            # default site https://base64.dev
//   node scripts/bing-rank.mjs https://base64.dev
//
// Note: the BWT *AI citations* report is CSV export-only (no API) — check it in
// the Bing Webmaster UI → AI Performance.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadKey() {
  if (process.env.BING_WEBMASTER_API_KEY) return process.env.BING_WEBMASTER_API_KEY.trim();
  const envPath = path.join(root, '.env.local');
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, 'utf8').match(/^\s*BING_WEBMASTER_API_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const API = 'https://ssl.bing.com/webmaster/api.svc/json';
const KEY = loadKey();
const SITE = process.argv[2] || 'https://base64.dev';

// Collect output so we can also emit a GitHub Actions step summary.
const lines = [];
const log = (...a) => { const s = a.join(' '); lines.push(s); console.log(s); };
function writeSummary() {
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + lines.join('\n') + '\n```\n');
  }
}

if (!KEY) {
  const msg = 'No BING_WEBMASTER_API_KEY found. In CI add it as a repo secret; locally add it to .env.local.';
  if (process.env.GITHUB_ACTIONS) {
    // Don't fail the scheduled workflow red just because the secret isn't set yet.
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '> ' + msg + '\n');
    console.log(msg);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

function msDate(s) {
  const m = String(s).match(/\/Date\((\d+)/);
  return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : String(s);
}

async function call(method) {
  const url = `${API}/${method}?apikey=${encodeURIComponent(KEY)}&siteUrl=${encodeURIComponent(SITE)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status} — ${text.slice(0, 200)}`);
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${method}: non-JSON response — ${text.slice(0, 200)}`); }
  return json.d ?? json;
}

async function main() {
  log(`\nBing Webmaster — ${SITE}\n${'='.repeat(40)}`);

  try {
    const traffic = await call('GetRankAndTrafficStats');
    const rows = (traffic || []).map((r) => ({
      date: msDate(r.Date),
      impressions: r.Impressions ?? 0,
      clicks: r.Clicks ?? 0,
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    log('\nRank & Traffic (last 14 data points):');
    if (!rows.length) log('  (no data yet — normal for a freshly verified/submitted site)');
    for (const r of rows) log(`  ${r.date}  impressions=${r.impressions}  clicks=${r.clicks}`);
    const totImp = rows.reduce((s, r) => s + r.impressions, 0);
    const totClk = rows.reduce((s, r) => s + r.clicks, 0);
    log(`  ── totals: impressions=${totImp}  clicks=${totClk}`);
  } catch (e) { log('\nRank & Traffic: ' + e.message); }

  try {
    const queries = await call('GetQueryStats');
    const top = (queries || [])
      .map((q) => ({ query: q.Query, impressions: q.Impressions ?? 0, clicks: q.Clicks ?? 0, pos: q.AvgImpressionPosition ?? q.Position }))
      .sort((a, b) => b.impressions - a.impressions).slice(0, 15);
    log('\nTop queries by impressions:');
    if (!top.length) log('  (none yet)');
    for (const q of top) log(`  ${String(q.impressions).padStart(5)} imp  ${String(q.clicks).padStart(4)} clk  pos~${q.pos}  ${q.query}`);
  } catch (e) { console.log('\nQuery stats: ' + e.message); }

  try {
    const pages = await call('GetPageStats');
    const top = (pages || [])
      .map((p) => ({ url: p.Query || p.Url, impressions: p.Impressions ?? 0, clicks: p.Clicks ?? 0 }))
      .sort((a, b) => b.impressions - a.impressions).slice(0, 15);
    log('\nTop pages by impressions:');
    if (!top.length) log('  (none yet)');
    for (const p of top) log(`  ${String(p.impressions).padStart(5)} imp  ${String(p.clicks).padStart(4)} clk  ${p.url}`);
  } catch (e) { console.log('\nPage stats: ' + e.message); }

  log('');
  writeSummary();
}

main().catch((e) => { console.error(e); process.exit(1); });
