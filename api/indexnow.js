// Vercel serverless function: submit all sitemap URLs to IndexNow.
// IndexNow pushes URLs directly to Bing + Yandex (which feed Copilot / ChatGPT
// search), so the index — and AI citations — refresh in days, not months.
//
// Triggered daily by the Vercel cron defined in vercel.json, and callable
// manually (GET /api/indexnow). Submitting the same URL set is idempotent and
// harmless, so no auth is required; if CRON_SECRET is set we honor it.

const HOST = 'base64.dev';
const KEY = '9e97d91a399a5cba8c97458212475e47';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP = `https://${HOST}/sitemap.xml`;

async function getSitemapUrls() {
  const res = await fetch(SITEMAP, { headers: { 'User-Agent': 'base64.dev-indexnow' } });
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const urls = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) urls.push(m[1]);
  return urls;
}

module.exports = async (req, res) => {
  // Optional cron-secret guard (Vercel sets Authorization: Bearer <CRON_SECRET>).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }
  }

  try {
    const urlList = await getSitemapUrls();
    if (urlList.length === 0) {
      res.status(500).json({ ok: false, error: 'no urls found in sitemap' });
      return;
    }

    const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
    const submit = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });

    res.status(200).json({
      ok: submit.ok,
      indexnowStatus: submit.status,
      submitted: urlList.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
};
