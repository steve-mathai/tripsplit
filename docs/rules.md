# Tripsplit: working rules

For anyone changing this repo, human or AI agent. Each rule is here because breaking it has a concrete cost. Background is in [architecture.md](architecture.md), decisions in [memory.md](memory.md).

## Read first

1. This is not the Next.js you know. Before writing Next code, read the relevant guide in `node_modules/next/dist/docs/` ([AGENTS.md](../AGENTS.md)). `next dev` rewrites that AGENTS.md block, so commit it with your work instead of reverting it.
2. Check [memory.md](memory.md) gotchas before running scripts or tests.

## Money

3. Money is integer paise, always. No floats in stored or computed amounts. Floats are allowed only for display (`toFixed(2)` in a UPI link, chart widths).
4. Parse user text with `parseINR` and print with `formatINR` ([money.ts](../src/lib/money.ts)). Never `Number(text) * 100`, never `toLocaleString` for rupees.
5. Every split goes through `validateSplit` and `computeShares` ([split.ts](../src/lib/split.ts)). The form preview, the server and the balance maths must call the same functions so they cannot disagree by a paisa. Do not write a second splitter, not even a "simple" one in a component.
6. Keep tie-breaks deterministic and independent of input order (lowest memberId wins leftover paise; settle output is sorted). A change that makes output depend on array order is a bug.
7. Balances must sum to exactly zero. `minimumTransfers` throws if they do not; do not catch that to make a page render.

## Writes and data

8. Every write is validated on the server, whatever the client form already checked. Server actions are public endpoints and accept any JSON; narrow input with `isRecord` and `isOneOf` and throw `UserError` with a plain message.
9. Every write is scoped to the trip in the URL. A new server action must load the trip from the slug, then prove each id in the request belongs to it (`requirePlanItemInTrip`, `requireExpenseInTrip`, `requireMemberInTrip`, or the membership check inside `validateExpense`). A link to one trip must never touch another.
10. A write that touches more than one row uses `runAtomically` ([db/index.ts](../src/db/index.ts)). Build the statements without awaiting them, and generate ids beforehand because batched statements cannot read each other's results. Known exception: `setReaction`, where a half-finished write is harmless (an empty row that reads ignore). Do not add more.
11. Constraints belong in the schema as well as in code. New enums and ranges get a `check`. Map the Postgres errors users can cause in [pg-errors.ts](../src/lib/pg-errors.ts) and add a test there.
12. Schema changes: edit [schema.ts](../src/db/schema.ts), run `npm run db:generate`, commit the new files under `drizzle/`, never hand-edit generated SQL or snapshots. Apply to Neon with `npm run db:migrate` and `DATABASE_URL` set.
13. Dates are `YYYY-MM-DD` strings, never `Date` objects crossing a boundary. Use [dates.ts](../src/components/dates.ts) (UTC based) for display and day lists. "Today" for defaults is India time.
14. Seed data uses made-up names and no UPI ids, ever. A fake id could belong to a real person. Do not add real people's names, numbers or UPI ids to the repo, the demo or the docs.

## Next.js and Cache Components

15. `cacheComponents` is on. Any request-time read (database, `cookies()`, `params`-dependent queries) lives in an async component rendered under `<Suspense>` with a skeleton, and that component starts with `await connection()`. Without it the read fails during prerender.
16. Server-only modules (`src/app/t/[slug]/identity.ts`) import `server-only`. Client components never import from `db/` or that file; they receive data as props and call server actions.
17. After a mutation, call `revalidatePath("/t/<slug>", "layout")` through the `refresh` helper in [actions.ts](../src/app/t/%5Bslug%5D/actions.ts) so every tab re-renders.
18. Return friendly failures from actions as `{ error }` through `guarded()`. Do not swallow errors on the client: show them in a `role="alert"` element.
19. Do not memoise per-trip data with `"use cache"` without a plan for invalidation; the app relies on every read being fresh.

## UI

20. Mobile first. Design and check at 375px wide, then desktop (content max width 640px). No horizontal overflow except deliberate chip rows (`chip-row`).
21. Tap targets are at least 44px (`min-h-11`, `h-11 w-11`). Existing exceptions at 36px (the "Pay via UPI" button and the All, None and Fill evenly chips) are debt, not precedent.
22. Respect safe areas: `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` on anything fixed to an edge. Form inputs stay at 16px text or larger so iOS does not zoom on focus.
23. Use the tokens in [globals.css](../src/app/globals.css) (`bg-card`, `text-muted`, `btn-primary`, `chip`, `field`, `card`). No new hard-coded hex values in components except for fixed brand colours (WhatsApp green) and category or avatar palettes. Every new colour token needs a dark value.
24. No new runtime dependencies without a written reason in the commit message. Charts and icons are hand-rolled on purpose ([bars.tsx](../src/components/bars.tsx), [icons.tsx](../src/components/icons.tsx)). Dev dependencies need a reason too.
25. Interactive state is exposed to assistive tech: `aria-pressed` on toggles (votes, reactions), `aria-label` on icon buttons, `aria-live` for live totals, `role="alert"` for errors. Emoji and decorative icons are `aria-hidden`.
26. Money figures use `tabular-nums`. Headings and large amounts use `font-display`.

## Copy

27. Plain, friendly, short. Indian English. Say what happened and what to do next ("Add the first expense and the maths takes care of itself").
28. Rupees as ₹ with en-IN grouping through `formatINR`. Dates as `Fri 30 Oct`, times as `6:00 am`.
29. No em dashes or en dashes in docs or new copy. (The trip date range in the UI uses an en dash; leave it.)
30. Errors name the problem in the user's terms ("₹40 left to assign"), never a stack trace or a constraint name.

## Tests and checks

31. Any change under `src/lib/` needs a test in `src/lib/__tests__/`, written to fail without the change. Property tests use a seeded PRNG so failures reproduce.
32. Before every commit all four pass: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Report real output, not memory.
33. A change to `demo-data.ts` must keep `demo-data.test.ts` green (valid splits, in range, settles to zero).
34. If the change is visible to users, check it in the running app at 375px, in light and dark mode, and say what you saw.

## Environment and git

35. On this Windows machine run `npm` and `npx` through PowerShell. Git Bash cannot find node for npm scripts. Template:
    `powershell.exe -NoProfile -Command "$env:Path='C:\nvm4w\nodejs;'+$env:Path; Set-Location 'D:\Downloads\MATITHI\trip-splitter'; npm test"`
36. PGlite allows one process on `.data/`. Stop the dev server before `db:seed`, `db:migrate` or anything else that opens the database.
37. Never commit `.env*` (except `.env.example`) or `.data/`. Both are in [.gitignore](../.gitignore); do not `git add -f` them.
38. Commit as the personal GitHub account (`steve-mathai`). The repo-local git config is set to it; the machine default is the work account (`stevemathew-zuro`). Run `git config user.name` and `git config user.email` before committing, and do not change identity to make a command work.
39. Do not push, deploy, create Vercel or Neon projects, or change repository visibility without the owner's explicit OK. Commits happen when asked.
40. Update the docs that your change makes untrue ([README](../README.md), [memory.md](memory.md), [phases.md](phases.md)) in the same change.
