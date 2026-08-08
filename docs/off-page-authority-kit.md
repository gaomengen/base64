# Off-Page Authority Kit — the one lever Bing flagged

_2026-08-08. Bing Webmaster's single recommendation is "not enough inbound links from high-quality domains." That's exactly what pins the head terms at **position 8** (`base64` 5,934 impressions/mo, pos 8.3; `base64 decode` pos 9.3) instead of top-3. Moving those up is worth more than any new page. This is the play._

## Rules (read first)
- **Earn, don't buy.** Paid links / link exchanges / PBNs are discounted and risk penalty. Never.
- **Only where genuinely helpful.** Every placement must add real value to that thread/list, or it's spam (and gets removed + hurts you).
- **Disclose ownership** when relevant ("I built this" / "disclosure: my tool"). Communities punish stealth self-promo; they reward honest useful tools.
- **Cadence:** 2–4 quality placements/month beats 40 spammy ones. Quality domains compound; volume of junk does nothing.
- **Bonus:** these same placements (Reddit, GitHub, Stack Overflow) are *heavily* weighted by the AI answer engines — so each good link also grows your 11.4K AI citations.

---

## 1. GitHub awesome-lists (highest ROI, lowest effort — do these first)
Submit a one-line PR adding base64.dev to relevant curated lists. These are high-authority domains (github.com) and get scraped by LLMs constantly. Target lists (search "awesome <topic>" + `site:github.com`):
- **awesome-dev-tools / awesome-web-tools / awesome-developer-tools** — general dev utilities.
- **free-for.dev** (free-for-dev/free-for-dev) — huge, high-authority; add under "Tools / Design and UI" or "Development".
- **awesome-devops**, **awesome-kubernetes** — for `/kubernetes-secret-decoder` + `/dockerconfigjson`.
- **awesome-powershell** — for `/powershell-encoded-command-decoder`.
- **awesome-security / awesome-ctf** — for `/magic-decode`, `/saml-decoder`, `/jwt-decoder`.
- **awesome-json** (for the json sibling site), **awesome-vin** (fastvin).

**PR line template:**
> `- [base64.dev](https://base64.dev/) — Fast, private, in-browser Base64 encoder/decoder + 100 tools (image/PDF/hex/JWT/SAML/k8s-secret decoders). No ads, no tracking.`

Do ~5 of these. Each merged PR = a high-authority backlink.

## 2. Your own GitHub presence
- Add a small **"Tools"** section or badge to any of your public repos' READMEs linking base64.dev and the sibling sites.
- If you don't have one, create a lightweight public repo (e.g. the base64.dev source is already `gaomengen/base64` — make sure its README has a clear description + link, and add topics/tags `base64`, `developer-tools`, `encoding`). A well-described repo README is itself a citable, indexed page.

## 3. Stack Overflow (answer, don't drop links)
Find questions your tools genuinely solve, write a real answer, and link the tool *as a supporting resource* (not the whole answer). High-value question patterns (search each):
- "decode base64 to PDF" / "convert base64 string to file" → link `/base64-to-pdf`, `/base64-to-file`.
- "decode kubernetes secret" / "kubectl secret base64" → link `/kubernetes-secret-decoder` (+ explain the encoding-not-encryption point).
- "powershell -EncodedCommand decode" / "decode powershell base64" → `/powershell-encoded-command-decoder`.
- "atob is not defined react native", "flutter base64 Invalid character", "android base64 newline" → your mobile fix pages.
- "decode SAML response", "base64 gzip decode" → `/saml-decoder`, `/base64-gzip-decode`.

**Answer template** (adapt, never paste identically):
> Base64 in [X] is [the actual explanation + code]. If you want to eyeball it without writing code, I built a free in-browser decoder for this exact case: [link] (runs locally, nothing uploaded). Disclosure: it's my tool.

Answer the *code* first; the link is a footnote. 3–5 genuinely helpful answers > 50 link-drops (which get flagged).

## 4. Reddit (authentic, community-matched)
Each ecosystem tool has a natural subreddit. Don't post "check out my site" — answer a real question or share in a "what tools do you use" thread:
- **r/webdev, r/programming** — the general tools (image/pdf/data-uri). Best via "cool tools" / "show off your side project" threads.
- **r/kubernetes, r/devops** — `/kubernetes-secret-decoder`, `/dockerconfigjson` ("the secrets-are-base64-not-encryption" angle plays great here).
- **r/PowerShell** — `/powershell-encoded-command-decoder` (IR/blue-team audience loves this).
- **r/netsec, r/securityCTF** — `/magic-decode`, `/saml-decoder`, `/jwt-decoder`.
- **r/sysadmin** — the cert/PEM + basic-auth tools.
Lead with the *problem you solved*, mention the tool as how you solved it. Reddit is a top AI-citation source, so a well-received comment doubles as AEO fuel.

## 5. Dev.to / Hashnode posts (1–2 genuinely useful articles)
Write real, useful posts that naturally reference the tools. Highest-fit topics (your proven high-citation clusters):
- "Kubernetes secrets are Base64, not encryption — here's what that actually means" → links `/kubernetes-secret-decoder`, `/articles/is-base64-encryption`.
- "Decoding a PowerShell -enc payload during incident response" → `/powershell-encoded-command-decoder`.
- "Sending images to GPT-4o / Claude / Gemini: the Base64 payload each one wants" → `/image-to-base64-for-ai-vision`.
These rank, get shared, and get cited by AI. Cross-post to your own blog if you have one.

## 6. Tool directories (submit once, done)
Legit directories that pass real signal: **AlternativeTo**, **Slant**, **SaaSHub**, **Openbase**, plus "online tools" aggregators. Submit base64.dev + the siblings.

---

## Priority order (do in this sequence)
1. **5 awesome-list PRs** (1 hour, permanent high-authority links) — biggest bang.
2. **README pass** on your public repos (30 min).
3. **3 Stack Overflow answers** on the k8s / powershell / pdf questions (real answers).
4. **1 Dev.to post** (the "secrets aren't encryption" one — proven citation topic).
5. **Reddit**, opportunistically, when a matching question appears.
6. Directories (submit-and-forget).

Ten quality placements over a month should move the "high-quality inbound links" needle enough to start lifting the head terms off position 8 — where 12,000+ monthly impressions are waiting. Re-check Bing Webmaster → Backlinks in ~3 weeks to see referring domains climb.

## What to ignore
Fiverr "SEO backlinks", link farms, comment spam, reciprocal-link schemes, "DA50 guest post" offers. All discounted or penalized. The list above is the entire real playbook.
