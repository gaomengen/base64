# base64.dev — off-page promotion kit

On-page + technical SEO is strong; the ceiling now is **authority (backlinks) and discovery**.
These are legitimate, value-first ways to earn links and referral traffic. Work top-down — the
first three buckets are the highest ROI for the least effort. Don't blast everything at once;
a steady trickle of quality links reads better to search engines than a one-day spike.

> Reusable one-liner: **base64.dev — a fast, privacy-first Base64 encoder/decoder for developers.
> Text, image, file, PDF, and 18-language tools. Everything runs locally in the browser — no ads,
> no tracking, no upload.**

---

## 1. Developer tool directories (submit the site)

Free listings, durable links, real referral traffic. Submit the homepage with the one-liner above.

- **AlternativeTo** — alternativeto.net (list as an alternative to base64decode.org / base64encode.org)
- **Product Hunt** — producthunt.com (a launch; see the launch blurb below)
- **SaaSHub** — saashub.com
- **Slant** — slant.co ("best base64 tools")
- **Toolfinder / Toolify / There's An AI For That**-style dev-tool directories
- **DevHunt** — devhunt.org (dev-tool focused)
- **Awesome-tools aggregators** (free-for-dev style sites)
- **Hacker News tools lists / lobste.rs** (see §3 for the post itself)

## 2. "Awesome" GitHub lists (open a PR adding base64.dev)

These are curated, high-authority repos. Open a small PR adding one line in the right section.
Search GitHub for the list, confirm base64.dev fits the category, then PR. Suggested entry line:

```
- [base64.dev](https://base64.dev) — Fast, privacy-first Base64 encoder/decoder (text, image, file, PDF) with per-language guides. Runs locally, no tracking.
```

Targets to check (categories in parentheses):
- `sindresorhus/awesome` → links out to sub-lists
- `awesome-web-dev-resources`, `awesome-devtools`, `awesome-tools` (online tools)
- `awesome-base64` / any encoding-tool list (search "awesome base64", "awesome encoding")
- language-specific awesome lists where a "Base64 in {lang}" guide is genuinely useful
  (e.g. an awesome-rust "resources" section → link the Rust guide, not the homepage)
- `public-apis` / `free-for-dev`-style lists if a fitting "utilities" section exists

PR etiquette: one line, alphabetical/section-correct placement, follow the repo's CONTRIBUTING,
no marketing language in the PR description — just "adds a free, no-tracking Base64 tool."

## 3. Show HN / lobste.rs / Reddit (community, value-first)

**Show HN draft**

> Title: `Show HN: base64.dev – a privacy-first Base64 tool that runs entirely in your browser`
>
> Body:
> I kept reaching for base64 tools that upload your data to a server, show ads, or get the
> details subtly wrong. base64.dev does it all locally with the FileReader/TextEncoder APIs —
> nothing leaves the page. It auto-detects encode vs decode, handles images/files/PDFs and
> URL-safe Base64, and there are per-language pages (Python, JS, Go, Rust, …18) that pair a live
> tool with the canonical, correct snippet. No ads, no tracking, no sign-up. Feedback welcome —
> especially on edge cases (padding, UTF-16 in PowerShell, the SVG url-encode-vs-base64 tradeoff).

Post Tue–Thu morning US time. Reply to every comment. Don't repost if it doesn't catch.

**Reddit** — share the *specific useful page*, not the homepage, in answer to a real need:
- r/webdev, r/learnprogramming, r/javascript, r/rust, etc. — only when someone asks a relevant
  question, link the matching `/base64-encode-{lang}` or converter page as a genuine answer.

**lobste.rs** — only if you have an account with karma; same Show HN framing.

## 4. Answer existing questions (Stack Overflow / forums)

The per-language and troubleshooting pages are perfect, *non-spammy* answers when they genuinely
solve the question. Find live questions and add a real answer that includes the working snippet,
then (optionally) "interactive version: <link>".

High-intent question themes that map to existing pages:
- "base64 encode in {language}" → `/base64-encode-{language}`
- "why is my PowerShell base64 different" → `/base64-encode-powershell` (UTF-16 trap)
- "convert base64 to image/pdf/file" → the matching converter
- "how much bigger is base64 / base64 size" → `/base64-size-calculator`
- "base64 vs base64url / JWT" → `/base64url`, `/articles/base64-jwt`
- "invalid base64 padding" → `/articles/base64-invalid-padding`

Rule: the answer must stand on its own without the link. The link is a bonus, never the point.

## 5. Content that earns links on its own (already have hooks)

- The **comparison/cheat-sheet** idea (one-liner per language + CLI + alphabet/padding table) is
  the most linkable single page — devs bookmark and cite cheat sheets. Build it, then it becomes
  the thing you submit to the lists above.
- The **size calculator** and the **"Is Base64 encryption?"** answer page are natural citation
  targets for blog posts and AI answers.

---

### Tracking what works
After a push, watch referral traffic (Vercel Analytics) and new linking domains (Bing Webmaster
→ Backlinks, and GSC → Links). Pour more effort into whatever channel actually sends devs.
