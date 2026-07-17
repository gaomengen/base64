# base64.dev — Strategy Summary

_Last updated 2026-07-17. Companion docs: [`competitive-teardown-and-plan.md`](competitive-teardown-and-plan.md) (full teardown), [`ecosystem-roadmap.md`](ecosystem-roadmap.md) (what to build next), [`bing-indexnow-setup.md`](bing-indexnow-setup.md) (Phase 1 checklist), [`promotion-kit.md`](promotion-kit.md) (off-page)._

## The one-line thesis
Don't out-spend a 15-year domain (base64decode.org) on Google. Out-**flank** it on Bing (which is also ChatGPT + DuckDuckGo), out-**content** it on the weak-SERP long tail it never built, and out-**product** it with dev tools and speed it structurally can't match. Spend effort on indexing and genuine community placement, never on buying links.

## Why this works (the opening)
- base64decode.org is a **pure Google-SEO play**: a 2010 domain with tens of thousands of thin programmatic `/enc/{word}` pages, zero structured data, zero articles, no dev tools, dated no-dark-mode UX.
- Our traffic is **~94% non-Google** (Bing / DuckDuckGo / ChatGPT / Yandex / Qwant / Yahoo; Google is a rounding error). That's the flank — the channels the incumbent ignores.
- **Bing is the master lever:** ~87% of ChatGPT citations come from Bing's top 10, and DuckDuckGo is Bing-powered. Winning Bing ≈ winning ChatGPT + Copilot + DDG at once. Bing also indexes new sites fast and rewards literal exact-match on-page — the opposite of Google's slow, age-weighted ranking.

## The three fronts (none of them the Google head term)
1. **Bing / AEO** — where domain age doesn't matter and we're already configured (AI-crawler-allow `robots.txt`, `llms.txt`, IndexNow key + daily cron, schema on every page).
2. **Weak-SERP long tail** — dozens of "base64 to X" and "X decode" queries with no strong incumbent.
3. **Out-product + ecosystem tools** — interactive, fast, dark-mode tools the incumbent doesn't have.

## What we shipped (this build-out: 70 → 97 pages, 8 PRs, all live + IndexNow'd)
- **Wave 1** — 11 adjacent-tool pages (data-uri-generator, base64-to-svg/csv/blob, hex/utf-8/html-entity/url decode+encode, jwt-decoder, basic-auth-header-generator) + 2 concept articles (is-base64-encryption, base64-vs-base64url).
- **Wave 2** — 5 ecosystem tools (kubernetes-secret-decoder, base64-to-qr, base64-gzip-decode, base64-to-excel, base64-certificate-decoder) + a freshness pass (Last-updated stamps + cross-language link grid) on all 18 language pages.
- **Wave 3** — SAML decoder.
- **Wave 4** — AI-vision cluster: image-to-base64-for-ai-vision hub + claude-api-base64-image + gemini-api-base64-image + 2 error pages (gpt-vision-base64-invalid-image-error validator, base64-image-too-large-vision-api resizer).
- **Also** — PowerShell `-enc` decoder, dockerconfigjson generator/decoder, GraphQL/Relay cursor decoder.

## The biggest lesson: mine demand, don't guess
We nearly built a `/enc/{word}` clone of the incumbent's dictionary carpet-bomb. **Autocomplete mining killed it.** Real "base64 encode X" demand is about **formats, contexts, and ecosystems** (image, pdf, qr, gzip, excel, kubernetes secret, certificate), *not* dictionary words — and the per-word tail is invisible/unmeasurable and rides on authority we can't replicate on a new domain. So we pivoted to **ecosystem tools**, and every one hit a weak SERP (forum threads, gists, no purpose-built tool).

The repeatable content pattern that emerged: **an interactive client-side tool + an error-explainer, targeted at one tech niche.** Kubernetes secrets, SAML, PowerShell `-enc`, JWT, AI-vision — each is a daily pain with no clean tool and a Bing/DevOps/ChatGPT audience. Plus **AEO error-string pages** (exact error text + fix + in-page validator) are cheap and get cited.

## Current state & what's pending
- **Live:** 97 URLs, all submitted to Bing via IndexNow on every deploy. GitHub repo notifications muted.
- **The one big free lever still not done (user action):** verify base64.dev in **Bing Webmaster Tools** and request-index the new pages — see `bing-indexnow-setup.md`. This accelerates everything already shipped.
- **Next:** let Bing index for ~2–3 weeks, read which pages/ecosystems land in analytics, then double down on winners. Remaining roadmap (ranked in `ecosystem-roadmap.md`): HL7 OBX decoder, ZPL/Zebra converter, mobile error pages, Google Sheets.
- **Off-page (Phase 4):** authentic Stack Overflow / GitHub README / Reddit placements — the "good links you can't buy" that move Bing and seed LLM citations.

## What NOT to do
- Don't buy links / chase DR (not a Google factor; won't dent a 2010 incumbent).
- Don't carpet-bomb dictionary-word pages (unmeasurable, dilution risk, can't out-authority the incumbent).
- Don't build ecosystem pages blind — mine autocomplete first, confirm a weak SERP.
