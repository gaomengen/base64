# articles/ — guides and explainers

## Purpose

Long-form pages that answer one Base64 question each (per-language how-tos, padding, URL-safe Base64,
JWT, SAML, Kubernetes secrets, AI-vision images, "is Base64 encryption"). They are hand-written static HTML,
served at `/articles/<slug>` (Vercel `cleanUrls`), and exist to be found by search and cited by AI answers,
then send readers to the tools. No build step generates them.

## Files

- `<slug>.html` (38 pages on 2026-11-27): one article each. Head carries title, description, canonical
  `https://base64.dev/articles/<slug>`, Open Graph tags, and three JSON-LD blocks: `TechArticle` (26) or
  `Article` (12) with `datePublished` / `dateModified`, `BreadcrumbList`, and `FAQPage`.
- `index.html`: the `/articles` hub that links every article. Has no `FAQPage` block.
- `style.v2.css`: the stylesheet every page links (`/articles/style.v2.css`).
- `style.css`: the older stylesheet. No page links it any more; only a cache header in `vercel.json` still names it.

## Page shape

Shared header with the theme toggle, an optional inline encode/decode widget (30 of 39 pages: textareas
`input` / `output`, wired by `B64.wireTextTool` from `/tools.js`), a contents list, `h2` sections with ids that
match the list, an FAQ whose questions match the `FAQPage` JSON-LD, and the shared footer. Vercel Analytics
loads with `defer`. Copy an existing article as the template for a new one.

## Rules

- A new article needs three more edits outside this folder: a link in `index.html` here, a `<url>` in the root
  `sitemap.xml`, and a line under "Guides & Articles" in `llms.txt`. All 38 articles were in all three on
  2026-11-27; keep it that way.
- Every JSON-LD block must parse. Run a `json.loads` loop over the pages before pushing (broken FAQ blocks
  shipped once, 2026-06-17). All blocks parsed on 2026-11-27.
- Visible FAQ text and the `FAQPage` answers say the same thing.
- Bump `dateModified` when the content changes in substance.
- New topics only for real, mined demand with a weak results page (AGENTS.md); no thin variants of an
  existing article.
- Widgets run in the browser only; nothing a reader pastes leaves the page.

## Gotchas

- Root-relative links (`/tools.js`, `/articles/style.v2.css`) mean a local preview must serve the repo root:
  `python3 -m http.server 8123`, then open `/articles/<slug>.html` (`.html` is needed locally, not in production).
- A stylesheet change for articles goes in `style.v2.css`; editing `style.css` changes nothing visible.
- The theme choice is shared with the tools through `localStorage` key `base64dev-theme`.

## Tests

None automated. Check the JSON-LD loop above, open each changed page in a browser (widget works, contents
links jump, theme toggles), and after deploy `curl -s https://base64.dev/articles/<slug>` for a 200.
