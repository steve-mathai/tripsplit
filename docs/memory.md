# Tripsplit: project memory

A living log for future sessions (human or AI). Read this before touching the repo. Update it when a decision, gotcha or the current state changes. Other docs: [prd](prd.md), [architecture](architecture.md), [rules](rules.md), [phases](phases.md), [design](design.md).

## Current state (26 Oct 2026)

| Item | State |
| --- | --- |
| Product | v1 complete: trips, plan with votes, expenses (equal, exact, shares, subset), settle-up, summary, people |
| Repo | https://github.com/steve-mathai/tripsplit (public), one commit `19340f1` on 26 Oct 2026, working tree clean before these docs were added |
| Tests | 67 passing in 7 files (`npm test`, run 26 Oct) |
| tsc, lint, build | Green at push per the orchestrator; not re-run while writing the docs |
| Demo trip | `/t/kochi-2026`: 11 members, 26 plan items (6 options, 57 vote or reaction entries), 25 expenses totalling ₹90,066, settles in 10 payments |
| Deployed | No. Vercel and Neon steps are in the [README](../README.md); next step is phase 8 in [phases.md](phases.md) |
| Real trip | Kochi, 30 Oct to 2 Nov 2026, 11 friends |

## Where things live

| What | Where |
| --- | --- |
| Money, split, settle, balances, summary maths | `src/lib/*.ts`, tests in `src/lib/__tests__/` |
| Schema, connection, queries, seed | `src/db/` ([schema.ts](../src/db/schema.ts), [index.ts](../src/db/index.ts), [queries.ts](../src/db/queries.ts), [demo-data.ts](../src/db/demo-data.ts)) |
| Server actions and identity cookie | [actions.ts](../src/app/t/%5Bslug%5D/actions.ts), [identity.ts](../src/app/t/%5Bslug%5D/identity.ts) |
| Pages | `src/app/page.tsx` (landing), `src/app/t/[slug]/**` (trip) |
| Design tokens | [globals.css](../src/app/globals.css) |
| Migrations | `drizzle/` (committed) |
| Screenshots | `docs/screenshots/` |
| Original build spec | Not in the repo; it was a scratch file for the build agents. Where it differs from the code, the code wins (see below). |

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 24 Oct 2026 | No accounts; the share link is the permission; identity is a per-trip cookie | Sign-up is what kills adoption in a WhatsApp group. Accepted trade-off: anyone with the link can edit. |
| 24 Oct 2026 | One `expense_splits` table with integer weights for every mode; "subset" is just which members have a row | One table and one maths function (`computeShares`) instead of a model per mode |
| 24 Oct 2026 | Money as integer paise; leftover paise by largest remainder | ₹100 over 3 must be 3334 + 3333 + 3333, never 33.333 |
| 24 Oct 2026 | Settle-up is an exact minimum (bitmask DP up to 20 non-zero balances, greedy beyond) | Greedy is not always minimal. The README example (+6, +7, -4, -6, -3) needs 3 payments, greedy makes 4. |
| 24 Oct 2026 | Drizzle with one Postgres schema; PGlite locally, Neon in production | Zero-setup local dev on real Postgres, no Docker, same SQL in production |
| 24 Oct 2026 | Cache Components on (the spec allowed turning it off); reads under `<Suspense>` with `await connection()` | Fast static shell with streamed data; the rule is cheap once known |
| 24 Oct 2026 | Hand-rolled charts and icons, no UI libraries | Six runtime dependencies total; the charts are simple |
| 24 Oct 2026 | Demo seed has made-up names and no UPI ids | A fake UPI id could belong to a real person |
| 24 Oct 2026 | Dates stored as `YYYY-MM-DD` strings | No timezone can shift a trip day |
| 25 Oct 2026 | `runAtomically`: `db.batch` on Neon, transaction on PGlite | An independent review found expense and split writes were not atomic. neon-http has no `transaction()`. |
| 25 Oct 2026 | Tie-break for leftover paise is the lowest memberId, not input order | The review found the form preview and server could disagree by a paisa when inputs arrived in different orders |
| 25 Oct 2026 | `UserError` plus Postgres SQLSTATE mapping; `error.tsx` at root and under the trip | The review found missing error pages and swallowed client errors |
| 25 Oct 2026 | Payload validation on every action; ids must belong to the trip; impossible dates (31 Feb) rejected | Server actions are public endpoints |
| 25 Oct 2026 | Settle output is sorted and independent of input order | Reviewer found non-deterministic results among equally good answers |
| 25 Oct 2026 | Vercel guard: refuse to start without `DATABASE_URL` | An embedded database on Vercel would silently lose data |
| 26 Oct 2026 | Public repo under the personal account `steve-mathai`, repo-local git identity | The machine default is the work account |

## Deviations from the original spec

The code is the source of truth. Notable differences:

- Tie-break: the spec said ties follow "memberId order as given". The code uses the lowest memberId (string order), independent of input order.
- Expense form: a full page with a sticky save bar, not a sheet (the spec allowed either). Sheets are used for "Invite the gang" and "Who are you?".
- Share: the sheet always offers WhatsApp and Copy link, and shows "More apps" (the native share sheet) only where `navigator.share` exists. The spec made `navigator.share` the first choice.
- Fonts: added Fraunces for display type alongside Plus Jakarta Sans.
- Votes table: one row per member and item with two nullable columns (`vote`, `emoji`), as the spec allowed.
- Demo data: 26 plan items and 25 expenses, but only one exact and one shares expense; 11 expenses are partial-group.
- Identity needed only for voting and reacting. Lock in, delete, add plan and all expense and people actions work without it.
- Error pages (`error.tsx`, `not-found.tsx`) were not in the spec; they came from the review.
- The spec's optional `predev` hook was not added; `db:setup` stays explicit.
- Settlements table skipped, as the spec said; it is phase 9.
- Property test: 400 random rounds checked against an independent brute force, stronger than the spec's "few hundred cases, count at most n - 1".

## Gotchas

Environment
- **npm needs PowerShell.** From Git Bash, npm scripts cannot find node. Use:
  `powershell.exe -NoProfile -Command "$env:Path='C:\nvm4w\nodejs;'+$env:Path; Set-Location 'D:\Downloads\MATITHI\trip-splitter'; npm test"`
- **PGlite allows one process on `.data/`.** Stop the dev server before `db:seed` or `db:migrate`. `npm test` is pure maths and does not open the database, so it is safe beside a running dev server. Any future test that opens the DB will not be.
- **Preview tool.** `preview_start {name}` in the Claude desktop app reads the workspace-root `D:\Downloads\MATITHI\.claude\launch.json`, which only has `tatva-dev`. For this app run `next dev -p 3210` and open it by URL.
- **Git identity.** Repo-local config is the personal account (`steve-mathai`); the machine default is the work account (`stevemathew-zuro`). Check before committing.
- **AGENTS.md block** is rewritten by `next dev`. Commit it rather than reverting it.

Next.js
- **Cache Components.** Request-time reads (database, cookies) sit under `<Suspense>` and call `await connection()` first. PGlite's `Date.now()` otherwise errors during prerender.
- **Unknown slug returns HTTP 200** with the not-found UI, because `notFound()` runs after the shell has streamed. Do not write a test that expects a 404 status.
- **Next 16 error boundaries receive `retry`**, not `reset`.
- **Fonts** are fetched from Google at build time, so the build needs network.
- **`NEXT_PUBLIC_SITE_URL`** is read in `layout.tsx` for `metadataBase`. Set it when deploying; leave it unset (not empty) locally, because `new URL("")` throws.

Database
- **neon-http has no `transaction()`.** That is why `runAtomically` uses `batch()` there. Batched statements cannot read each other's results, so generate ids first.
- **The PGlite import is still static.** A dynamic import was skipped because `db` is a synchronous proxy and the `tsx` scripts compile to CommonJS.
- **Seed amounts vary by paise.** Member ids are random UUIDs and ties go to the lowest id, so which people get a spare paisa differs between seeds. A fresh seed can show figures a few paise different from the screenshots (for example Ananya's payment). Zoya paying Aarav ₹6,772.44 is stable.
- **`db:seed` deletes and recreates the trip** (slug `kochi-2026`), so any edits to the demo are lost.

Demo
- **The demo needs 10 payments for 11 people**, the maximum, because no subset of balances cancels. Aarav paid the ₹27,500 homestay (and 33,625 rupees in all) and is owed roughly ₹24,700; in the minimum solution Kabir pays Diya rather than Aarav (visible in `settle.png`), so "everyone pays Aarav" is not exactly right. The DP earns its keep on trips where sub-groups cancel, and the tests cover that.

## Known issues and small debts

- Last write wins; other phones need a reload (phase 10).
- `src/lib/expense-shape.ts` duplicates `src/app/t/[slug]/maths-input.ts` and only tests use it. Pick one and delete the other.
- A few controls are 36px, not 44px; two saffron-text pairs and the owes and gets-back pills are under 4.5 contrast in light mode (see [design.md](design.md#accessibility)).
- Expense description is limited to 80 characters in the form and 120 on the server; shares stepper stops at 20 while the server allows 1000.
- A member with a zero amount in an exact split still counts in "split among N" and cannot be removed.
- `getTripBySlug` runs up to three times per navigation.
- The UI date range uses an en dash. The no-dash rule applies to docs and new copy, not to that existing format.
- No automated tests for `queries.ts`, server actions or components.

## How to run

```
npm install
npm run db:setup      # migrate + seed the demo (PowerShell on this machine)
npx next dev -p 3210  # then open http://localhost:3210/t/kochi-2026
npm test
npx tsc --noEmit
npm run lint
npm run build
```
