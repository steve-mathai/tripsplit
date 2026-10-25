# Tripsplit: phases

What was built, and what comes next in what order. Product context is in [prd.md](prd.md), working rules in [rules.md](rules.md).

## Completed

v1 was built between 24 and 26 Oct 2026 by an orchestrator (Opus) that planned and reviewed, with Sonnet builders. Dates below are the span of the work, taken from file timestamps and the single commit (`19340f1`, 26 Oct 2026).

| # | Phase | Dates | What it delivered | Status |
| --- | --- | --- | --- | --- |
| 1 | Scaffold | 24 Oct | create-next-app (Next 16.4, React 19, Tailwind 4, `src/`), Cache Components on, `serverExternalPackages` for PGlite, `.gitignore` for `.env*` and `.data` | Complete |
| 2 | Maths and database | 24 Oct | `src/lib` money, split, balances, settle, summary with Vitest; Drizzle schema, first migration, PGlite and Neon switch, queries, seed and demo data | Complete |
| 3 | UI | 24 to 25 Oct | Landing page, trip shell, five tabs, expense form with three split modes, identity picker, share sheet, charts | Complete |
| 4 | Independent review fixes | 25 Oct | Atomic expense writes (`runAtomically`), error pages, server-side payload validation, preview and server rounding parity (ties by memberId), impossible dates rejected, client errors no longer swallowed, deterministic settle, Vercel guard when `DATABASE_URL` is missing | Complete |
| 5 | Polish | 25 Oct | Skeletons, empty states, dark mode, safe-area handling, hero and screenshots, Open Graph metadata | Complete |
| 6 | README | 25 Oct | Problem, approach, local run, Vercel and Neon steps, next steps | Complete |
| 7 | GitHub push | 26 Oct | Public repo [steve-mathai/tripsplit](https://github.com/steve-mathai/tripsplit), single commit, repo-local personal git identity | Complete |

State at the end of phase 7: 67 unit tests green, demo trip seeded (11 people, 26 plan items, 25 expenses totalling ₹90,066), not deployed.

## What comes next

### Order and rationale

The order follows the calendar of the real trip (30 Oct to 2 Nov) and then dependencies between features.

| # | Phase | Why here | Size |
| --- | --- | --- | --- |
| 8 | Deploy to Vercel and Neon | Nothing else matters until the group has a real link. It also reveals problems that only exist online (cookies in the WhatsApp browser, cold starts). Needed before 30 Oct. | S |
| 9 | Record settlements | The first thing the group will ask for on 2 Nov. It is the only feature that changes the maths, so build it before the rounding and history features that sit on top of it. | M |
| 10 | Live updates | With 11 people logging expenses at the same time, stale screens are the most likely real-world annoyance. Polling is small. | S |
| 11 | Round to whole rupees | Depends on settlements (rounding applies to what is left to pay). Matches how people use UPI. | S |
| 12 | Change log and undo | The open-link model is only acceptable while mistakes are recoverable. Do it before the link goes beyond close friends. | M |
| 13 | Optional trip PIN | Raises the privacy floor for groups that want it. After the change log because that explains who did what, and a PIN does not. | M |
| 14 | Quick add | Faster logging matters most once people are using it daily. Pure parsing on top of the existing create path. | S |
| 15 | Receipt photos | Largest scope: the first object storage and the first new runtime dependency. Last, and depends on the privacy decision in phase 13. | L |

Size is a rough scale: S is an evening, M a day or two, L several days.

Every phase must meet the common checks in [rules.md](rules.md): tests for `src/lib` changes, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, migrations generated and committed, docs updated.

### Phase 8: Deploy to Vercel and Neon

Needs the owner's explicit OK for each external action (rule 39).

Scope: create a Neon project, run `npm run db:setup` against it, import the repo on Vercel, set `DATABASE_URL` for Production and Preview, set `NEXT_PUBLIC_SITE_URL` to the production URL (it feeds `metadataBase`), choose a function region near the Neon region.

Acceptance criteria:
1. The production URL opens `/t/kochi-2026` with all five tabs and 25 expenses.
2. Creating a trip on a phone over mobile data works, and the link shared into a WhatsApp chat shows the trip name and dates in its preview.
3. Adding an expense with a 4-way split persists all four split rows (check in Neon), and a deliberately invalid payload leaves no partial rows.
4. A deployment without `DATABASE_URL` fails with "DATABASE_URL is not set" rather than starting.
5. Opening the link from WhatsApp on one Android and one iOS phone is tested: is the identity cookie kept between the in-app browser and the default browser? The answer is recorded in [memory.md](memory.md).
6. A decision is recorded on whether the demo trip stays public and editable, and how it gets reset (`npm run db:seed` with the Neon URL).

Risks: cold starts on a free tier; the Google Fonts download at build needs network.

### Phase 9: Record settlements ("mark as paid")

Scope: a `settlements` table (`id`, `trip_id`, `from_member`, `to_member`, `amount_paise` greater than 0, `created_at`, check `from_member <> to_member`, foreign keys without cascade on members). `computeBalances` takes settlements as a second list: the payer's `paid` side rises and the receiver's falls, so nets still sum to zero. Settlements are not spend, so `summarize` is unchanged.

UI: a "Mark paid" action on each transfer card records that exact amount. A "Payments made" list on the Settle tab shows who paid whom and when, with a remove button.

Acceptance criteria:
1. Tapping "Mark paid" on a card makes that transfer disappear, updates the balances and the "N payments settle everyone" heading, and survives a reload.
2. After marking every transfer, the page says "Everyone is settled up" and all balances read "settled up".
3. Removing a recorded payment restores it.
4. Unit tests: balances with settlements still sum to zero; a settlement that exactly clears a pair yields the same remaining minimum as recomputing from scratch; a property test extends the existing one.
5. The write is validated server-side: both members belong to the trip, amount is a positive integer within `MAX_AMOUNT_PAISE`.
6. A member who appears in a settlement cannot be removed (`removeMember` and the People page's `canRemove` both account for it).
7. Migration generated with `db:generate` and committed.

Risks: anyone can mark anyone's payment as paid under the open model; phase 12 makes that visible. Decide whether partial amounts are allowed (v1 of this phase: exact transfer amounts only).

### Phase 10: Live updates

Scope: a small client component in the trip layout calls `router.refresh()` on an interval (start at 15 seconds) while the page is visible and nothing is pending. Polling first, because server-sent events do not fit serverless functions well.

Acceptance criteria:
1. An expense added on phone A shows on phone B's Expenses tab within 20 seconds with no manual reload.
2. Polling pauses when the tab is hidden (`visibilitychange`) and resumes on return with an immediate refresh.
3. It does not refresh while a form submit or vote is pending, and never wipes text typed into the expense form or an open Add plan form.
4. Query volume is measured: 11 idle open tabs for an hour, and the number written down in [memory.md](memory.md) against the Neon free tier limits.

Risks: Neon compute hours, and a refresh flicker on slow phones.

### Phase 11: Round to whole rupees

Scope: a toggle on the Settle tab (state in the URL as `?round=1` so the shared WhatsApp list matches what the sender saw). Rounding is applied to the balances before settling, not to payments afterwards, so the rounded balances still sum to zero and `minimumTransfers` stays valid. Use largest remainder across members to distribute the odd paise.

Acceptance criteria:
1. With the toggle on, every transfer is a whole number of rupees.
2. Rounded balances sum to exactly 0 and each differs from the true balance by less than ₹1.
3. A line shows the drift ("₹0.62 of rounding is spread across the group").
4. With the toggle off the output is identical to today.
5. Unit tests for the rounding function with a property test (zero sum, bounded error, deterministic regardless of input order).
6. "Copy all" and "Send on WhatsApp" use whichever mode is on.

Risks: settlements recorded in paise (phase 9) next to rounded targets; the rule is that rounding applies to what remains after settlements.

### Phase 12: Change log and undo

Scope: an `activity` table (`id`, `trip_id`, `member_id` nullable, `kind`, `summary`, `before` and `after` JSON, `created_at`). Every action in `actions.ts` that changes data writes one entry in the same `runAtomically` batch. A feed screen, reachable from the header or People.

Acceptance criteria:
1. Each write action produces exactly one entry with a plain sentence, for example "Kabir changed Munnar lunch from ₹4,687 to ₹4,867". Who is the cookie identity, or "Someone" when there is none.
2. Undo is offered on the latest 20 entries. Undoing an edit restores the exact previous row and splits, undoing a delete recreates it with its splits, and each undo is itself logged.
3. An undo that would conflict (a member removed, a plan item already gone) fails with a friendly message and changes nothing.
4. The change and its log entry succeed or fail together.
5. Tests for the sentence builder and for snapshot restore.

Risks: snapshot shape versioning when the schema changes; table growth (fine at this scale).

### Phase 13: Optional trip PIN

Scope: a PIN (4 to 6 digits) set at trip creation or later from a trip settings sheet. Stored as a salted scrypt hash from `node:crypto` (no new dependency). After entry the browser gets a signed cookie (HMAC with a `SESSION_SECRET` environment variable). Trips without a PIN behave as today.

Acceptance criteria:
1. A new browser opening a PIN-protected link sees only a PIN screen. The WhatsApp preview and page title do not reveal the trip name or dates.
2. A wrong PIN is rejected with a delay and an attempt limit per trip.
3. Server actions are gated too: calling an action directly without the cookie fails (tested by invoking the action, not by hiding buttons).
4. The PIN can be changed or removed by someone who already has access.
5. A trip with no PIN works exactly as before, including the demo.

Risks: a 4-digit PIN is weak against a determined guesser, so the rate limit must be enforced server-side. Lost PIN means a database edit.

### Phase 14: Quick add

Scope: one text box on the Expenses tab: "450 chai Meera". A pure parser in `src/lib/` extracts amount (reusing `parseINR` rules), a payer matched to a member name case-insensitively (default: me), and the rest as the description. Defaults to an equal split among everyone, today's date and category Food. It shows a preview line to confirm; anything unclear opens the full form prefilled.

Acceptance criteria:
1. "450 chai Meera" saves ₹450, description "chai", paid by Meera, equal among all, after one confirming tap.
2. "₹1,200 auto fare" with no name uses the current member, or asks who paid when there is no identity.
3. Ambiguous or missing amounts fall back to the full form with whatever was understood filled in.
4. Parser unit tests include rupee symbols, commas, paise, names with spaces, and no-match cases.
5. Saving goes through `createExpense` unchanged, so every existing validation still applies.

### Phase 15: Receipt photos

Scope: attach one photo to an expense. Compress on the phone before upload (long edge about 1600px). Store in object storage (for example Vercel Blob), keep only the URL in a new column. Show on the expense edit page; delete with the expense.

Acceptance criteria:
1. A photo taken on a phone uploads in under 5 seconds on mobile data, is at most about 500 KB after compression, and shows on the expense page.
2. The upload endpoint is scoped to the trip like every other write and rejects non-images and files over the size cap.
3. Deleting the expense deletes the stored file.
4. If a PIN is set (phase 13), image URLs are not publicly guessable or listable.
5. The new dependency and its cost are justified in the commit message (rule 24) and added to [architecture.md](architecture.md).

Risks: storage cost and abuse on an open link; privacy of receipts.

## Not planned

Multiple currencies, user accounts, native apps, expense categories beyond the four, per-item itemised bills, recurring expenses.
