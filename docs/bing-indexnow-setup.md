# Bing + IndexNow readiness (Phase 1)

Bing is the highest-leverage channel for base64.dev: ~87% of ChatGPT citations come from Bing's top 10, and DuckDuckGo is Bing-powered. Bing also indexes new sites far faster than Google. This is the checklist to get the 13 new pages (and the existing 70) indexed fast.

## What's already done in the repo
- `robots.txt` allows Bingbot, GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, Applebot (and blocks the zero-value Ahrefs/Semrush/etc. scrapers). ✓
- `api/indexnow.js` reads `sitemap.xml` and POSTs every URL to IndexNow (Bing + Yandex). ✓
- `vercel.json` cron runs `/api/indexnow` daily at 06:00 UTC. ✓
- The IndexNow key file `9e97d91a399a5cba8c97458212475e47.txt` is committed and served. ✓
- All 13 new URLs are in `sitemap.xml`, so the next IndexNow run submits them automatically. ✓

## What YOU need to do (needs your login — I can't)

### 1. Bing Webmaster Tools (~10 min, one-time)
1. Go to https://www.bing.com/webmasters and sign in.
2. Add site `https://base64.dev`. Fastest verification: **Import from Google Search Console** (if base64.dev is already there). Otherwise use the XML-file or meta-tag method — if it gives you a meta tag, paste it into `index.html`'s `<head>` and redeploy.
3. Submit the sitemap: **Sitemaps → Submit** → `https://base64.dev/sitemap.xml`.
4. **URL Inspection → Request Indexing** for the highest-value new pages first: `/jwt-decoder`, `/data-uri-generator`, `/url-decode`, `/hex-decode`, `/articles/is-base64-encryption`.
5. Turn on **IndexNow** in Bing Webmaster (Settings → IndexNow) — confirms the key and shows submission history.

### 2. Confirm IndexNow is actually firing (after deploy)
Once this branch is deployed to production, hit the endpoint once manually and check the response:
```bash
curl -s https://base64.dev/api/indexnow | jq
# expect: { "ok": true, "indexnowStatus": 200, "submitted": 83 }
```
`submitted` should read **83** (70 existing + 13 new). If it's 70, the deploy didn't include the updated sitemap. In Bing Webmaster → IndexNow you'll see the submitted URLs appear within minutes.

### 3. Google Search Console (secondary)
Google is the slower, lower-priority channel, but still worth it: submit `https://base64.dev/sitemap.xml` in Search Console and request indexing for the same top pages. Don't expect head-term movement — this is for the long-tail pages.

## Then: verify AEO pickup (ongoing, ~monthly)
Ask ChatGPT / Perplexity / Bing Copilot these and log whether base64.dev is cited:
- "best base64 decoder online"
- "how do I decode a JWT without verifying it"
- "is base64 encryption"
- "data uri generator"
- "how to convert base64 to a blob in javascript"

The freshness signal matters: pages updated in the last 30 days get ~3.2× more Perplexity citations, so re-run IndexNow whenever content changes (the cron already does this daily).
