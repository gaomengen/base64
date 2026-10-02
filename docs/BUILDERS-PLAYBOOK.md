# Builder's Playbook

Transferable lessons for building products, distilled from real sessions. Not tied to any
one project — general guidance for the next one (and the one after). Each item is a
principle first, with a concrete war-story in _italics_ so it sticks.

---

## 1. Product design

**Deliver the core value; make quality a layer on top, not a gate.**
The user came for the *data*, not for your validation of it. If you can't verify, still
hand them what you extracted — clearly labeled. Returning nothing is the worst outcome.
_We refused to output line items unless a bank statement reconciled. An uploaded invoice
returned "0 rows." Wrong: the whole point is to pull the rows. We flipped to
**extract-first, verify-second** — always return the items; the "verified" badge sits on
top._

**Verify-or-abstain. Never present wrong as right.**
When your product makes a checkable claim (a number, a match, a total), verify it against
an independent invariant and say so honestly. Trust is the moat; one confident-but-wrong
answer erodes it more than ten honest "we couldn't check this."

**Guard the vacuous success.**
An empty result that "passes" is a false positive. `0 == 0` reconciles; a document with no
rows should never show a green check. Explicitly reject the empty/boundary case.
_A scanned/failed extraction showed "Verified — 0 transactions." Fixed the gate to require
≥1 row before it can ever say "verified."_

**Honest multi-state beats a misleading binary.**
"Verified / Couldn't verify" hid a third reality. Three states — **Verified** (green),
**Extracted, not verified** (amber, "double-check"), **Couldn't read** (red) — tell the
truth and still deliver value in the middle case.

**Let real usage redraw the map.**
Every upload surfaced the next fix or the next opportunity. An invoice and a real-estate
closing statement both "worked," revealing the product is really _"any itemized PDF →
structured rows,"_ not just "bank statements." Keep a **sharp wedge** as the entry point,
but notice the adjacent TAM the engine already serves.

**Show context so users trust what they see.**
Filename, size, date on the result. "I know they just uploaded it, but still" — orientation
is cheap and builds confidence.

---

## 2. Business logic & pricing

**Charge for delivered value, never for failure.**
Fairness is a trust feature. Bill when the user got something usable; make failure free.
_Policy evolved: don't-charge-on-failure → charge-if-verified → charge-if-verified-or-
extracted → **charge whenever rows were delivered** (`count > 0`); only "delivered nothing"
is free. Each step made the rule simpler and fairer._

**Bill off a signal you already record.**
The final rule needed no new field or migration — it counted an existing `rowCount > 0`.
Prefer deriving policy from data you already have over adding schema + backfills.

**Name the abuse vector; defer the guard.**
Free failed/unverified attempts could be spammed to burn compute. Note it, ship the fair
policy now, add an attempt-rate-limit when scale (or paid tiers) actually warrants it.

---

## 3. UI / UX

**Every async action needs instant feedback + a double-submit guard.**
A slow request with a dead-looking button gets clicked twice. On click: disable, show a
spinner/"…"​, re-enable on error. _"Share" fired a multi-second job with no feedback → user
clicked twice._

**Return the user to where the content lives.**
After an action, navigate to the surface that now holds the result, not a generic home.
_"Convert another" bounced to the landing page; it should return to the dashboard where the
uploader and result live._

**Debug the _computed_ style, not the CSS you wrote.**
Specificity silently overrode our rule for many iterations. Only reading the browser's
computed value revealed a broad `label { display: block }` beating a scoped flex rule.
_The checkbox was never mis-nudged; it was rendering as `block` the whole time._ Fix the
real cause before reaching for pixel nudges (and optical centering ≠ geometric centering,
once the layout is actually correct).

**Cache-bust versioned assets on every deploy.**
Browsers serve stale CSS/JS between deploys. `styles.css?v=N` (bump N) or users report
"it looks broken" when it's just cached. Recurring, sneaky, cheap to prevent.

**Prominence hierarchy: one thing leads, the rest recede.**
Key info (the filename) bold and larger; secondary (size, date) small and muted. Don't
paint everything the same gray.

**Progressive disclosure keeps the primary surface clean.**
Move secondary actions (change password) into an account dropdown / modal. The main view
stays focused on the job.

**Small correctness details:** sticky footer for short pages; theme-aware, token-based
colors; hidden-attribute vs class-`display` conflicts (`[hidden]{display:none!important}`);
neutral styling when a value's sign isn't meaningful (don't paint invoice amounts green).

### Copy & microcopy

**Never let microcopy overpromise.** Say what the product will *actually* do, not what sounds
gracious. A confirmation that writes a check the product won't cash erodes trust the moment the
user notices.
_A "share this failed file?" flow said "Thanks — we'll add support for it." A user uploaded a
random design doc (not a statement at all) and got promised support we'll never build. Fixed to
"Thanks for helping us improve" — honest, and it still thanks them._ Aspirational is fine
("so we can handle more formats over time"); a per-item promise is not.

**Kill the em-dash overload.** Sprinkling em-dashes through a paragraph is a model writing tic —
it reads as AI-generated and cluttered. Prefer commas, periods, or a restructured sentence; at
most one em-dash per passage. This applies to UI copy *and* long-form content. (If you catch
yourself writing "X — Y — Z," rewrite it.)

---

## 4. Technical architecture

**A verifiable invariant is worth more than clever extraction.**
Design the product around a checkable equation (`sum(items) == stated_total`,
`opening + Δ == closing`). It's simultaneously your accuracy metric, your test oracle, and
your marketed trust feature. Extraction is a guess; an invariant turns it into a claim you
can prove.

**Deterministic code is the asset; the LLM is scaffolding.**
An LLM gets you live before you have parsers, and — gated by your invariant — it's safe to
point at hard cases. But it's **non-deterministic** (same input, different output → one run
verifies, the next doesn't), slow, costs money, and can't be unit-tested. Treat every LLM
fire as a **TODO to write a deterministic parser**. The moat is the accumulated library of
tested parsers + the data telling you where to build next — not an API call anyone can make.
Trajectory: the tiers invert as deterministic coverage grows.

**Key data by a stable id, never a mutable field.**
Emails change; storage `_id`s couple you to the engine. A surrogate `usr_…` id gives safe
string lookups, dev/prod parity, and doesn't leak internals. _But weigh migration churn —
don't re-key data you just migrated for a lateral gain._

**Self-healing migrations beat scripts you can't run.**
Backfill on read: the first time an entity is touched, mint its new id and stamp its old
rows. No separate migration job, no prod DB access needed. _First login assigned the userId
and reattached history automatically._

**Snapshot before a consuming/mutating step.**
Capture the value you need _before_ an operation that transforms or detaches its input.
_pdf.js **detaches** the input ArrayBuffer while parsing; reading `.length` afterward
returned 0, so every conversion recorded `size: 0`. Snapshot the length before extraction._

**Fuzz with golden data; it finds the bugs you didn't imagine.**
A seeded synthetic generator (with injected messiness) + an assert on exact extraction and
the invariant. _On its first run it caught a real sign bug: overdrawn/negative balances lost
their minus. You won't think of that edge; the fuzzer will._

**Test where the behavior actually happens, and simulate the real hazard.**
Bugs hide in untested seams (thin HTTP wrappers, glue code). Tests that inject a *fake* of
the risky dependency miss failures the real one causes. _The `size:0` bug survived because
tests used a fake extractor that never detached the buffer; the fix added a test that
detaches it on purpose._

**Design the data/improvement instrument deliberately.**
To improve, you need to (a) capture the signal (consented, **de-identified** — mask the
values, keep the structure), and (b) read it back. The loop: **capture → read → build
parser → test → deploy → the hard case becomes boring.** Build the read path, not just the
write path.

**Graceful degradation via env gates + dependency injection.**
Features no-op cleanly without their key/DB (LLM without an API key, email without config),
so the rest of the system runs. Inject dependencies (the extractor) so they're testable
and swappable.

---

## 5. Serverless / deploy gotchas (hard-won)

- **`await` your writes.** Fire-and-forget DB writes are dropped when the function freezes
  after responding. Await anything that must land.
- **Match the runtime's handler signature.** Vercel Node functions are `(req, res)` — not
  Web `Request`/`Response`. Wrong shape → runtime crash.
- **Bundler quirks:** `.ts` import specifiers can dangle after transpile; keep imports at
  `.js` and run TS locally via a loader.
- **Logs are a live tail, not a history.** You can't fetch a past request's logs after the
  fact — to inspect prod behavior you must be listening _during_ the request, or persist the
  signal yourself and read it back.
- **Client routes each need a rewrite → `/`** or a refresh 404s.
- **Verify live after every deploy.** `curl` the deployed asset/endpoint; don't trust that
  "deployed" means "correct."

---

## 6. Debugging & judgment

**Let data correct your hypothesis — and say so when you were wrong.**
_I confidently diagnosed a "production font/extraction gap." The captured evidence showed
the failing file was a completely different document (a closing statement) that extracted
fine. No bug at all._ Chase evidence, not a satisfying theory. Announce the correction
plainly.

**Reproduce before you fix.** Confirm the mechanism (detached buffer, overridden CSS rule)
with a local repro or the computed state, so you fix the cause, not a symptom.

**Fix at the source, once.** A false-positive in a shared gate belongs in the gate, not
patched at each call site.

**A green synthetic test does not mean the parser is right — validate against the real
(de-identified) capture.** Twice now, a hand-written PNC fixture reconciled cleanly while
the *actual* statement failed, because the bugs live in the mess that invented fixtures
don't reproduce: a section keyword appearing **inside a transaction's own description**
(`ATM Withdrawal …` eaten by an un-anchored `/withdrawals?/` "section header" matcher),
cross-page `- continued` sections, and pages of prose/legal noise between the numbers.
The rule: build the parser, but **run it against the real de-identified sample and confirm
the row count/signs before trusting it** — the golden fixture proves you didn't regress,
the real capture proves you actually solved it. When a deterministic parser emits the same
transaction count as the LLM tier did, that's the strongest cheap signal it will reconcile.

**Anchor structural matchers; a substring match is a latent row-dropper.** Section/boundary
detection that keys off a bare `\bkeyword\b` will fire on the same word buried in a
description or memo and silently drop (or mis-sign) that row. Anchor to line start, and
never let a boundary rule run on a line that's clearly a data row (e.g. starts with a date).

---

## 7. Privacy & data handling

- **De-identify before you persist.** Mask the values (digits → placeholder), keep the
  layout/structure — that's the useful, low-liability training/diagnostic signal.
- **Consent before capture** for anything user-originated.
- **Never commit real user/financial data.** `gitignore` the raw files; keep real samples
  local-only; clear sensitive scratch data when done.
- **Match or beat the incumbent's privacy baseline**; make it a marketed feature.

---

## 8. How we work (process meta)

- **Tight loop:** edit → typecheck → test → commit → deploy → verify live. Small,
  verifiable steps; a green suite before every deploy.
- **Ship, then react to real use.** Real uploads drove the roadmap better than planning did.
- **Adversarial mindset finds bugs.** "Prove me wrong," fuzzers, and skeptical re-checks
  caught what happy-path testing missed.
- **Decide vs. ask:** proceed with sensible defaults on reversible technical calls; surface
  genuine business/scope/pricing forks to the human (charging policy, product direction).
- **Coordinate parallel work.** Don't edit files an agent/collaborator owns — a blind
  `git add -A` will sweep uncommitted edits into someone else's commit. One owner per file
  per change.
- **Persist the "why."** Record non-obvious decisions and their rationale so the next
  session (or teammate) doesn't re-litigate them.

---

_Living document. Add a line whenever a project teaches us something the next one shouldn't
have to relearn._
