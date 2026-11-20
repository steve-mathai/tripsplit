# Tripsplit security audit

- **Audit date:** 7 Nov 2026, against commit `e6de7b6` plus the working tree at the time.
- **Fix review:** 20 Nov 2026. Every status below was checked against the current code, and line numbers refer to the current tree.
- **Scope:** the whole repository. That covers:
  - Next.js 16.4.3 (App Router, Server Actions, `cacheComponents`)
  - Drizzle, with Neon over HTTP in production and PGlite locally
  - Configuration, dependencies and git history.

## Method

- **How the audit was run.** I ran the security-audit skill as a single-agent pass over every server action, the data layer, the identity cookie, output sinks, config, dependencies and git history. A second, independent reviewer then tried to refute each finding from source.
- **How fixes were checked.** I re-read the fixed code on 20 Nov 2026. I also ran the security tests: 8 files and 44 tests, all passing.
  ```
  npx vitest run src/__tests__/headers.test.ts src/lib/__tests__/slug.test.ts src/lib/__tests__/text.test.ts src/lib/__tests__/rate-limit.test.ts src/lib/__tests__/cookie-options.test.ts src/lib/__tests__/pg-errors.test.ts src/lib/__tests__/limits.test.ts src/db/__tests__/rate-limit.test.ts
  ```
- **What "confirmed" means.** The finding was traced in source and re-checked by the second reviewer. It was not exploited at runtime. No live penetration test was run, and nothing was sent to a deployed site.
- **What was not checked:**
  - The response headers were checked by a unit test against the config, not against a deployed Vercel URL.
  - The rate limiter was tested on PGlite, not on Neon.
- **Dependency checks.** `npm audit` was run on 7 Nov and on 20 Nov 2026. `npm audit fix --force` was never run.

## Threat model

- **Assets:**
  - Per trip: members' names and UPI ids (a UPI id often contains a phone number), the expenses and the plan.
  - The settle-up list, whose "Pay via UPI" links move real money.
  - The shared database and the compute bill.
- **Principals:**
  - Anyone on the internet.
  - A link holder: anyone with `/t/<slug>`, including people the link was forwarded to.
  - The operator.
- **Design decisions** (`docs/architecture.md`):
  - There are no accounts, and the share link is the permission. A link holder may read and change everything in that trip.
  - The `ts_<tripId>` cookie only records which member this browser says it is. It is a convenience, not authentication.
  - The demo trip `/t/kochi-2026` is public on purpose.
- **Boundaries that must hold:**
  1. Someone without a trip's link cannot find, read or change it. The slug is a bearer secret.
  2. A link to trip A never touches trip B.
  3. Anonymous users cannot exhaust the shared database or compute.
  4. Text one person writes never runs as script in another person's browser.
  5. Errors do not leak internals.
- **Out of scope by design:**
  - A link holder vandalising their own trip.
  - A link holder switching identity within the same trip.
  - These are listed below only where the impact is sharp, as with redirecting payments.

## Summary

| Id | Finding | Severity | Status (20 Nov) |
| --- | --- | --- | --- |
| S1 | Share slug was a 24.8-bit bearer secret with a guessable stem, and nothing limited guessing | Medium | Fixed |
| S2 | No rate limiting and no count caps on trip creation or any write | Medium | Mitigated |
| S3 | Any link holder can silently change any member's UPI id, which redirects "Pay via UPI" | Low | Accepted (open by design) |
| S4 | Public demo trip is world-writable and linked from the landing page | Low | Open |
| S5 | No security headers at all | Low | Fixed (deployed check pending) |
| S6 | Identity cookie had no Secure flag and Path=/ for every trip | Low | Fixed |
| S7 | Free-text fields accepted NUL and bidi control characters | Low | Fixed |
| S8 | Server action framework defaults were in force but not tightened | Info | Fixed |
| S9 | Cross-trip IDOR: none found; scoping lives only in the action layer | Info | Clean (hardening open) |
| S10 | Output encoding and XSS: no sink found | Info | Clean |
| S11 | Error handling: no internals reach the client in production | Info | Clean |
| S12 | Dependency advisories: dev-only on 7 Nov; on 20 Nov also 7 advisories against `next` 16.4.3, none of which apply to this app as configured | Info | Open (upgrade recommended) |
| S13 | Secrets: none in the working tree or the git history | Info | Clean |

## S1. Share slug was a 24.8-bit bearer secret with a guessable stem, and nothing limited guessing

**Severity: medium.** A guessed slug fully defeats the app's only access control for that trip. It was rated medium, not high, because finding one particular trip took about 10^5 to 10^7 requests, depending on how many trips share a name stem.

**Evidence, as of 7 Nov:**

- `slugFromName`, then in `src/db/queries.ts`, built the slug from:
  - a stem taken from the trip name (common names give common stems), and
  - a suffix of 5 characters from a 31-letter alphabet, picked with `byte % 31`.
- 31^5 is about 28.6 million values, or 24.8 bits. The modulo made 8 letters slightly more likely, which costs a negligible amount of entropy.
- Every server action answered "This trip no longer exists" for a wrong slug and something else for a right one. That made each action an oracle for whether a slug exists.
- Nothing limited guessing: no rate limit, no lockout and no proxy.
- For a stem shared by 100 trips, one hit cost about 286,000 requests, or roughly 1.6 hours at 50 requests per second from one machine.

**Fix, verified in `src/lib/slug.ts`:**

- The suffix is now 16 characters from the same alphabet (lines 2 to 4), giving about 79 bits.
- Bytes come from `crypto.getRandomValues`. Bytes at or above 248 are discarded (lines 9 and 13 to 23), so every letter is equally likely.
- The readable stem is kept (lines 26 to 35).
- `createTrip` uses it (`src/db/queries.ts:188`). The demo passes its fixed slug explicitly.
- `loadTrip` adds a missed-slug limit for server actions (`src/app/t/[slug]/actions.ts:47` to 56): 20 misses per 10 minutes per IP. After that, the client gets the same "This trip no longer exists" answer without a lookup.
- Page reads (`src/app/t/[slug]/layout.tsx:38`) are not limited. At 79 bits that does not matter.

**Test:** `src/lib/__tests__/slug.test.ts` (6 tests).

**Status:** fixed.

## S2. No rate limiting and no count caps on trip creation or any write

**Severity: medium.** An anonymous actor could fill the shared Neon database and burn compute, which stops writes for every trip. How much storage that takes depends on the Neon plan's quota.

**Evidence, as of 7 Nov:**

- `createTripAction` split the "others" field into an unlimited list of members, inserted in one statement.
- Each member row binds 6 parameters, so a trip with more than about 10,922 names went over Postgres' limit of 65,535 bind parameters. That produced a 500, and the request fit easily inside the 1MB default body.
- `addMember`, `addPlanItem` and `createExpense` had no count caps, and nothing was rate limited.
- Every page view loads the whole trip, and settling more than 20 balances uses an O(k^2) greedy pass. A huge trip is expensive on every view.

**Fix, verified:**

- **Per-trip caps.** These are in `src/lib/types.ts:78` to 80 and enforced in `src/db/queries.ts`:
  - 50 members (lines 185 and 204)
  - 500 plan items (line 295)
  - 500 expenses (line 459)
  - The members cap is far below the bind parameter limit.
- **Text length limits.** `TEXT_LIMITS` (`src/lib/types.ts:83`) caps each free-text field after sanitising (see S7).
- **Limiter table.** The `rate_limits` table (`src/db/schema.ts:124`, migration `drizzle/0001_cultured_gamora.sql`) holds fixed windows.
  - **Counting.** Each hit is counted by one atomic `insert ... on conflict do update` (`src/db/rate-limit.ts:20` to 30). That is a single round trip on neon-http, and it works unchanged on PGlite.
  - **Cleanup.** About 1 call in 100 deletes rows older than 24 hours (lines 40 to 47).
- **Key.** The key is a SHA-256 of the salt, client IP, action and trip id (`src/lib/rate-limit.ts:40` to 42), so raw IPs are never stored.
  - **Client IP.** It comes from the first `x-forwarded-for` hop, else `x-real-ip` (`src/lib/rate-limit.ts:30` to 37).
  - **IPv6.** Addresses are reduced to their /64 prefix (lines 17 to 24), so rotating addresses inside one network share a key.
  - **Anything else.** Values that are not an IP share one `unknown` key.
- **Limits** (`src/lib/rate-limit.ts:5` to 9):
  - 5 new trips per hour per IP, counted in `createTripAction` (`actions.ts:96`).
  - 60 writes per minute per IP per trip, counted in `loadTrip` (`actions.ts:54`), which every action goes through.
  - 20 missed slugs per 10 minutes per IP (`actions.ts:48` to 52).
- **Fails open.** If the limiter's own query errors, the request is allowed and the error is logged (`src/db/rate-limit.ts:64` to 73 and 87 to 93).
- **Body limit.** The 64kb limit (S8) also bounds a single request.

**Tests:**

- `src/lib/__tests__/rate-limit.test.ts` (8)
- `src/lib/__tests__/limits.test.ts` (2)
- `src/db/__tests__/rate-limit.test.ts` (4, on in-memory PGlite)
- `src/lib/__tests__/text.test.ts` (11)

**Residual risk:**

- **Trusted proxy headers.** The per-IP limits trust proxy headers. Confirm in Vercel's documentation that its edge overwrites `x-forwarded-for` rather than appending to a client-supplied value. On any other host, a client can forge the header.
- **Botnets.** A distributed botnet is not stopped. The 79-bit slug (S1) is the real defence against guessing.
- **Fail-open trade-off.** A database fault also removes the limit.
- **Cap race.** The caps check a count and then insert, so two simultaneous requests can pass a cap together by a small margin.
- **Neon not tested.** Neither the caps nor the limiter have run against Neon.
- **Unlimited reads.** A flood of page reads is left to the hosting platform.
- **`RATE_LIMIT_SALT` is documented nowhere.** It is not in `.env.example`. Without it, the key hash has an empty salt, so a leaked `rate_limits` table could be tested against known IPs.

**Status:** mitigated.

## S3. Any link holder can silently change any member's UPI id, which redirects "Pay via UPI"

**Severity: low.** This is allowed by the threat model, since link holders may edit anything. But it is the one edit that moves money. Its reach is limited because UPI apps show the payee's registered name before paying, and the group usually knows the payee.

**Evidence, current:**

- `updateUpiAction` (`src/app/t/[slug]/actions.ts:261` to 268) checks only that the member belongs to the trip (line 264). It never reads the identity cookie.
- `upiLink` (`src/components/settle-cards.tsx:26`) uses that UPI id as `pa`.
- Nothing records who changed it or when.

**What changed:**

- `cleanUpi` (`src/db/queries.ts:122` to 129) now sanitises the text, caps it at 50 characters and requires the `name@bank` shape (pattern at line 89).
- The action is rate limited like every write.
- None of this stops a valid but wrong id.

**Not done (recommended in the audit):**

- Show the payee's UPI id as plain text next to "Pay via UPI", so the payer can compare it with their UPI app.
- Store `upi_updated_at` and show "UPI id changed recently" for 7 days.

**Status:** accepted (open by design). The real fix is the trip PIN and change log under Recommendations.

## S4. Public demo trip is world-writable and linked from the landing page

**Severity: low.** Anyone can plant offensive text, fake members with real-looking UPI ids, or fake "Pay via UPI" links. That is content injection on the page the landing page sends every visitor to. The demo holds only made-up people and no UPI ids (`src/db/demo-data.ts`), and the issue is already noted in `docs/prd.md`.

**Evidence, current:**

- The demo has the fixed slug `DEMO_SLUG = "kochi-2026"` (`src/db/demo-data.ts:5`), seeded by `src/db/seed.ts:9` to 14.
- It is linked from `src/components/landing/hero.tsx:44` and `src/components/landing/footer.tsx:13`.
- `loadTrip` (`src/app/t/[slug]/actions.ts:47`) has no demo check, so every action writes to it.

**Fix (recommended, not built):** in `loadTrip`, throw `UserError("The demo is read-only. Start your own trip to try editing")` when `trip.slug === DEMO_SLUG`.

- Choosing an identity can stay allowed if it is moved off this path, since it only sets a cookie.
- Later, "Try it" could copy the demo into a fresh trip.
- Test it with a pure `isWritable(trip)` helper.

**Status:** open.

## S5. No security headers at all

**Severity: low.** No exploitable XSS was found (S10), so CSP is defence in depth.

- Clickjacking only helps someone who already has the slug, and that person can edit directly.
- Leaking the slug through the Referer header mattered because the URL path is the secret.

**Evidence, as of 7 Nov:** `next.config.ts` had no `headers()`, and there was no `proxy.ts`, `middleware.ts` or `vercel.json`.

**Fix, verified in `next.config.ts`:**

- **`headers()`** (lines 33 to 52) applies to every path.
- **Content-Security-Policy** (built at lines 9 to 23):
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline'`
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob:`
  - `font-src 'self'`
  - `connect-src 'self'`
  - `frame-ancestors 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`
  - `object-src 'none'`
  - `upgrade-insecure-requests`, in production only
  - Development adds `'unsafe-eval'` and `ws:`.
- **`'unsafe-inline'` for scripts is required.** A nonce-based CSP needs dynamic rendering. The Next 16 docs (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`, the dynamic rendering note and the PPR note) state that partial prerendering is incompatible with nonces. `cacheComponents` prerenders a static shell with inline RSC scripts. The app renders no raw HTML, which limits what the weaker script policy exposes.
- **Other headers:**
  - Strict-Transport-Security: two years, `includeSubDomains` (no `preload`).
  - X-Frame-Options: DENY.
  - X-Content-Type-Options: nosniff.
  - Referrer-Policy: no-referrer.
  - Permissions-Policy: camera, microphone, geolocation, payment, usb and browsing-topics all off.
  - Cross-Origin-Opener-Policy: same-origin.

**Test:** `src/__tests__/headers.test.ts` (3).

**Two notes:**

- **HSTS `preload`.** Removed on 20 Nov, as the audit recommended: getting onto the preload list is hard to undo, so add it only once a custom domain is settled.
- **Deployed check.** Check the real response headers on the deployed URL once it exists (see How to verify).

**Status:** fixed (deployed check pending).

## S6. Identity cookie had no Secure flag and Path=/ for every trip

**Severity: low.** The value is a member id that grants nothing beyond what the link already grants.

- Without Secure, the cookie could travel over a plain-http first request.
- With Path=/, every trip's cookie went on every request. A browser that has opened hundreds of trips approaches common header size limits.

**Evidence, as of 7 Nov:** `setIdentityCookie` used `path: "/"`, a one-year `maxAge`, `sameSite: "lax"` and `httpOnly: true`, and set no `secure` flag.

**Tamper check, still current:**

- `getCurrentMemberId` (`src/app/t/[slug]/identity.ts:8` to 11) returns the cookie value only if it is one of this trip's members. The cookie name is also bound to the trip id, so a forged cookie cannot act in another trip.
- Within a trip, writing another member's id gives the same result as `chooseIdentityAction` (`actions.ts:117` to 124), which is allowed by design.
- The cookie only gates votes, reactions and `createdBy`.

**Fix, verified:**

- `identityCookieOptions` (`src/lib/cookie-options.ts:7` to 15) sets:
  - HttpOnly and SameSite=Lax
  - Secure when `NODE_ENV` is production
  - path `/t/<slug>`
  - a one-year lifetime
- `setIdentityCookie` (`identity.ts:13` to 15) uses these options and takes the slug from all three callers (`actions.ts:105`, `121`, `130`).

**Test:** `src/lib/__tests__/cookie-options.test.ts` (2).

**Residual risk:** the value is not signed. A signature only matters once a PIN exists (see Recommendations).

**Status:** fixed.

## S7. Free-text fields accepted NUL and bidi control characters

**Severity: low.**

- A NUL character made Postgres raise SQLSTATE 22021, which was not mapped to a friendly message. The user got a generic 500 (production showed no internals).
- Bidi overrides such as U+202E in a member name could make the copied or WhatsApp settle text, or the UPI payee name hint, read differently from what is stored.

**Evidence, as of 7 Nov:**

- `requireText` and `optionalText` only collapsed whitespace and trimmed.
- `toUserError` mapped only 23505, 23503, 22007, 22008 and 22003.

**Fix, verified:**

- **`sanitizeText`** (`src/lib/text.ts:17` to 26):
  - Normalises to NFC and converts line endings.
  - Strips C0 controls (NUL included), DEL and C1 controls (line 4).
  - Strips bidi embeddings, overrides, isolates and direction marks, zero-width space, word joiner and BOM (line 7).
  - Keeps ZWJ and ZWNJ only between two characters, because emoji sequences and Indic scripts need them.
  - It strips characters rather than rejecting the input. That is acceptable: the stored text can no longer contain them.
- **`requireText` and `optionalText`** (`src/lib/text.ts:28` to 43) apply the sanitiser, then the length caps.
- **`toUserError`** (`src/lib/pg-errors.ts:25` to 45) now:
  - maps 22021 and 22P05 to "That text has characters we cannot save";
  - maps any other class 22 or 23 code to a generic "could not be saved" message;
  - rethrows everything else as a real bug.

**Tests:** `src/lib/__tests__/text.test.ts` (11) and `src/lib/__tests__/pg-errors.test.ts` (8).

**Residual risk:** look-alike letters, such as Cyrillic inside a Latin name, are not blocked.

**Status:** fixed.

## S8. Server action framework defaults were in force but not tightened

**Severity: info.** There was no exploitable gap.

- Next 16 compares the request's `Origin` host with `Host` / `X-Forwarded-Host` and rejects mismatches, in production too. Requests with no `Origin` are allowed with a warning, but browsers always send one on cross-site POSTs.
- Without accounts, a cross-site request can do nothing that the slug does not already allow.
- The identity cookie is SameSite=Lax.
- The default body limit was 1MB, far above the largest real payload (an expense with a few dozen splits, a few KB).

**Fix, verified:** `next.config.ts:32` sets `experimental.serverActions.bodySizeLimit` to `64kb`. `allowedOrigins` is correctly left unset.

**Test:** `src/__tests__/headers.test.ts` ("limits server action bodies to 64kb").

**Status:** fixed.

## S9. Cross-trip IDOR: none found; scoping lives only in the action layer

**Severity: info (positive).**

Every action loads the trip from the slug through `loadTrip` (`src/app/t/[slug]/actions.ts:47` to 56), then checks every id it receives against that trip:

| Action | Ids checked | Where |
| --- | --- | --- |
| `chooseIdentityAction` | member | `actions.ts:120` |
| `voteAction`, `reactAction` | plan item; member from a validated cookie | `actions.ts:143`, `155`; `identity.ts:10` |
| `lockInAction`, `deletePlanItemAction` | plan item | `actions.ts:169`, `178` |
| `addPlanItemAction` | `createdBy` from the validated cookie | `actions.ts:202` |
| `saveExpenseAction` (edit) | expense; payer and split members | `actions.ts:220` via `231` to `234`; `queries.ts:439` to `440` |
| `deleteExpenseAction` | expense | `actions.ts:239` |
| `updateUpiAction`, `removeMemberAction` | member | `actions.ts:264`, `273` |

- The comparisons use `===` against strings from the database, so ids sent as other types cannot match.
- `updateExpense` re-derives the trip id itself (`queries.ts:473`).
- All SQL is parameterised Drizzle. The one raw `sql` template (`queries.ts:148`) binds `name` as a parameter.

**Hardening (open, optional):**

- `deletePlanItem`, `lockInOption`, `deleteExpense`, `updateMember` and `removeMember` in `queries.ts` still take bare ids. They are safe only because the action layer checks first.
- Give each a `tripId` parameter and add `and(eq(table.id, id), eq(table.tripId, tripId))` to the `where`. Scoping then becomes structural for any future caller.
- Test: on in-memory PGlite, deleting trip B's expense with trip A's id removes 0 rows.

**Status:** clean (hardening open).

## S10. Output encoding and XSS: no sink found

**Severity: info (positive).**

- **No raw HTML.** There is no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in `src`. All user text renders as React text.
- **UPI link.** `upiLink` (`src/components/settle-cards.tsx:26`) is built with `URLSearchParams`.
  - The payee id is restricted by `UPI_PATTERN` (`src/db/queries.ts:89`) to letters, digits and `._-` around one `@`, so it cannot inject `&`, `#` or `?`.
  - The scheme is a constant `upi://pay?`, so a `javascript:` link is impossible.
  - The global `%40` to `@` replacement also touches the name and note fields. That is harmless.
- **WhatsApp links.** These use `encodeURIComponent` with `rel="noopener noreferrer"` (`settle-cards.tsx:74`, `src/components/share-button.tsx:44` to 46).
- **Clipboard.** Copied text is plain text.
- **Redirects.** These (`actions.ts:112`, `228`, `244`) use a slug that `loadTrip` has just matched in the database, so there is no open redirect.
- **Inline styles.** Values come from server-assigned palette constants, not user input.
- **Open Graph metadata.** Next escapes it (`src/app/t/[slug]/layout.tsx:13` to 25), and it sets `robots: { index: false }`.
- **Landing page:**
  - The photo credit links (`src/components/landing/footer.tsx:65`, `69`) come from the committed `public/photos/credits.json`. They are all `https://` Creative Commons and Wikimedia URLs and open in the same tab. Add `rel="noopener noreferrer"` if they ever get `target="_blank"`.
  - `src/app/manifest.ts` is static.
  - Images are local files through `next/image`, and no `remotePatterns` is configured, so the image optimiser cannot be used for SSRF.

**Status:** clean.

## S11. Error handling: no internals reach the client in production

**Severity: info (positive).**

- **Action errors.** Actions return only `UserError` messages through `guarded` (`src/app/t/[slug]/actions.ts:62` to 77). These are fixed strings, or they echo input that has already been validated.
- **Postgres errors.** `toUserError` (`src/lib/pg-errors.ts:25` to 45) maps SQLSTATE codes to fixed text. It never forwards the driver message or a constraint name.
- **Everything else.** Unknown errors are rethrown, and Next replaces them with a digest in production (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`, the production note).
- **Error boundaries.** Both render fixed copy and only call `console.error` in the browser (`src/app/error.tsx:10`, `src/app/t/[slug]/error.tsx:8`).
- **Development mode.** Full errors are shown there, as expected.
- The only gap found was the unmapped 22021 in S7, which is now fixed.

**Status:** clean.

## S12. Dependency advisories

**Severity: info.** None of the advisories reaches this app as configured. The `next` upgrade is still recommended.

### 7 Nov 2026: dev-only advisories

`npm audit` reported 12 moderate advisories, all in dev tooling:

- **esbuild `<=0.24.2` (GHSA-67mh-4wv8-2f99).**
  - Reached through `drizzle-kit` via `@esbuild-kit/core-utils`.
  - Only esbuild's dev server is affected, and drizzle-kit never runs it.
  - npm's fix is a downgrade to `drizzle-kit@0.18.1`. Do not apply it.
- **minimatch (GHSA-g3hv-75wg-m249).**
  - Reached through `typescript-eslint` and `eslint-config-next`.
  - The globs come from the repo's own config.
  - npm's fix is a downgrade of `eslint-config-next` to 15.5.29. Do not apply it.

### 20 Nov 2026: `next` 16.4.3 itself

`npm audit` lists `next` 16.4.3 (affected range 16.0.0 to 16.4.4, fix 16.4.6, not semver-major) with seven moderate advisories. The rest of the report is the same two dev-only advisories as above. Checked against this app:

| Advisory | Precondition | Applies here? |
| --- | --- | --- |
| GHSA-mfr8-8qww-v76h, `use cache` called through `unstable_cache` leaks across root params | `use cache` and `unstable_cache` | No: neither appears in `src` |
| GHSA-vc7v-qv4w-wrv8, nested `use cache` leaks across root params | `use cache` | No |
| GHSA-rhh4-g77r-r9qj, `use cache` with binary arguments | `use cache` | No |
| GHSA-vvgp-ww4w-46vf, fallback shell cache poisoning in Cache Components | Self-hosted with `next start`, `partialPrefetching` unset or false, `generateStaticParams` routes, blocking fallback shells | No: `next.config.ts` sets `partialPrefetching: true` (the published workaround), there is no `generateStaticParams`, and the target is Vercel |
| GHSA-7qx7-33qx-rqx2, SVG rejection bypass in `/_next/image` | Self-hosted image optimisation fed an attacker-supplied SVG | No on Vercel. Self-hosted, `next/image` only accepts local paths (no `remotePatterns`), so an attacker cannot supply the SVG |
| GHSA-f3mh-rxg3-f5g2, HttpOnly cookie exposed by an internal header on Edge runtime routes | Edge runtime routes | No: no `runtime = "edge"`, and no `proxy.ts` or `middleware.ts` |
| GHSA-pc58-hwjq-p385, response injection when self-hosted apps forward fetched responses | Self-hosted, and code that forwards `fetch` responses | No: the app makes no server-side fetches |

**Recommendation:** upgrade anyway, because the change is a patch release within the same minor version.

- **Why bother:**
  - It clears the audit noise.
  - It protects the app if it later adopts `use cache` (`docs/rules.md` already anticipates that), switches off `partialPrefetching`, or self-hosts.
- **How:** set `"next": "16.4.6"` and `"eslint-config-next": "16.4.6"` in `package.json` (both are exact pins today) and run `npm install` from PowerShell. Then run the four gates in `docs/rules.md`: `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build`.
- **Dev-only advisories:** leave them alone. Never run `npm audit fix --force`, which would downgrade drizzle-kit and eslint-config-next to breaking versions.
- **Dependabot.** It is now configured (`.github/dependabot.yml`) and will propose future bumps.

**Status:** open (upgrade recommended).

## S13. Secrets: none in the working tree or the git history

**Severity: info (positive).**

- **Git history.** The repository has 3 commits. On 7 Nov, `git log --all -p` was searched for credentialed `postgres://` URLs, `DATABASE_URL=<value>`, `npg_`, `ghp_`, `sk-`, `AKIA` and private-key headers. The only match was the README placeholder `DATABASE_URL=postgresql://...`.
- **Working tree.** On 20 Nov the same patterns, plus a filled-in `RATE_LIMIT_SALT`, were searched across tracked and untracked files with `git grep --untracked` (excluding `node_modules`, `.next` and `.data`). Nothing was found.
- **Env files.** The only env file is `.env.example`, whose `DATABASE_URL` is empty. `.gitignore` excludes `.env*` (except the example), `/.data/` and `/.next/`.
- **Environment variables used in code:** `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `RATE_LIMIT_SALT`, `NODE_ENV` and `VERCEL`.

**Status:** clean.

## Recommendations, not to build now

1. **Optional trip PIN** (`docs/phases.md`, phase 13). This is the real fix for "a guessed or forwarded link gives full access".
   - Reuse the `rate_limits` table, keyed by trip id, for the attempt limit. A 4-digit PIN with no server-side limit can be guessed in minutes.
   - Hide the trip name and dates from Open Graph metadata for PIN trips.
2. **Share link rotation and revocation.** Today a leaked link cannot be cancelled. Let someone with access issue a new slug and retire the old one.
3. **Signed identity cookie** (HMAC with a `SESSION_SECRET`). It adds nothing while anyone can pick any member. Build it together with the PIN (S6).
4. **A change log per trip.** Record who changed which expense, member or UPI id, and when. It is the practical answer to S3 and to vandalism in general.
5. **A read-only demo trip** (S4).
6. **Structural trip scoping in `queries.ts`** (the S9 hardening).
7. **Nonce-based CSP.** It needs `cacheComponents` and partial prerendering switched off, so every page would render dynamically. Revisit only if the app ever renders third-party or HTML content.
8. **Privacy and retention.** Names and UPI ids are personal data under India's DPDP Act 2023.
   - Add a short privacy note on the share sheet.
   - Delete trips idle for, say, 12 months.
9. **`SECURITY.md` contact.** It says "email to the owner" but gives no address. Add a real address before the repository is published.
10. **`RATE_LIMIT_SALT`.** Set it in Vercel as a long random value, and add a commented line to `.env.example` (S2).
11. **Upgrade `next` and `eslint-config-next` to 16.4.6** (S12).
12. **Check the headers on the deployed URL**.

## How to verify

Run `npm` from PowerShell on this machine, because it fails from Git Bash.

Run all tests:

```
npm test
```

Run only the security tests (8 files, 44 tests, all passing on 20 Nov 2026):

```
npx vitest run src/__tests__/headers.test.ts src/lib/__tests__/slug.test.ts src/lib/__tests__/text.test.ts src/lib/__tests__/rate-limit.test.ts src/lib/__tests__/cookie-options.test.ts src/lib/__tests__/pg-errors.test.ts src/lib/__tests__/limits.test.ts src/db/__tests__/rate-limit.test.ts
```

Check the headers on the deployed site, replacing the host:

```
curl -sI https://YOUR-DEPLOYMENT.vercel.app/ | grep -i -E "content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy|cross-origin-opener"
```

- All seven headers should appear.
- Open a trip and check in the browser developer tools that the `ts_` cookie shows HttpOnly, Secure, SameSite=Lax and path `/t/<slug>`.

Check the limiter on a deployed copy:

- Create six trips in an hour from one network.
- The sixth should be refused with "Too many new trips from this network, try again in an hour."

Re-run the dependency check:

```
npm audit
```

© 2026 Steve Mathai Mathew. All rights reserved.
