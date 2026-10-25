# Tripsplit: product requirements

Status: v1 built and pushed (26 Oct 2026), not yet deployed. Owner: Steve Mathew.
Companion docs: [architecture](architecture.md), [design](design.md), [rules](rules.md), [phases](phases.md), [memory](memory.md). Setup and a tour of the approach are in the [README](../README.md).

## Problem

An Indian friend group planning a trip lives in WhatsApp. The plan sits in a Google Sheet nobody opens, a poll gets buried under 200 messages, and money is tracked in someone's head. The origin of this project is a real trip: 11 friends, Kochi, 30 Oct to 2 Nov 2026, based in Thammanam, Munnar on Saturday, Alleppey and a toddy shop on Sunday.

Existing splitters fail this group in two ways:

1. They need every member to install an app and sign up before anyone can log a ₹40 chai. In practice two people do and nine never open it.
2. Their split models are too narrow. Real trip spending is not "divide by 11": one person skipped Munnar (10 ways), six went on the jeep safari, five went kayaking, drinkers at the toddy shop eat and drink double, and one lunch was ordered separately (exact amounts).

Tripsplit is one link, dropped in the group, opened on a phone. It holds the day-by-day plan (with votes), every expense in rupees with the splits people actually use, and a settle-up screen that gives the fewest UPI payments.

## Personas

| Persona | Who they are in the demo | What they need | What breaks for them elsewhere |
| --- | --- | --- | --- |
| The organiser | Creates the trip, pastes the link in WhatsApp, chases people to vote and pay | Create a trip in under a minute, get the whole group in without onboarding, one place for plan and money | Has to nag nine people to install an app, then re-enter their expenses |
| The casual friend | Opens the link once or twice, taps their name, votes on dinner, logs the odd expense | Zero sign-up, readable on a phone, a clear "you owe X" at the end | Never joins the app, so their spending is invisible and they are surprised by the final number |
| The person who paid the homestay | Aarav in the demo: paid ₹27,500 for the stay and is owed roughly ₹24,700 overall | Everyone pays him back, in as few transfers as possible, without a spreadsheet | Fronts a large amount and then does the collection maths by hand |

## Goals

1. A group can go from "link in WhatsApp" to "I am in" in two taps (open, tap name), with no account.
2. Every common split case works without a calculator: equal, partial group, shares, exact.
3. The money is always exact: parts add up to the total to the paisa, and balances sum to zero.
4. Settle-up produces the minimum number of payments and can be pasted into WhatsApp or paid through a UPI deep link.
5. The plan is decided in the app: propose options, vote, react, lock one in.
6. It works well at 375px wide on a phone, in rupees, and looks like a product someone designed.

## Non-goals (v1)

- Accounts, passwords, email or phone verification.
- Real access control. The link is the permission (see risks).
- Recording that a payment was made (phase 9 in [phases](phases.md)).
- Currencies other than INR. The `trips.currency` column exists and defaults to `INR`, but nothing reads it.
- Live sync between phones, receipt photos, a change log or undo, notifications.
- Editing a trip's name or dates, renaming a member, or editing a plan item. These are not in the UI (delete and re-add instead).
- Native apps or an installable PWA (no manifest).

## Constraints

- Mobile first. 375px is the primary design width, content is capped at 640px and centred on desktop. Tap targets are 44px.
- INR only, shown with en-IN grouping (₹1,23,456) and paise only when non-zero (₹1,234.50).
- No accounts. A visitor's identity is a per-trip cookie holding a member id.
- Opened from WhatsApp links, so it must tolerate in-app browsers, no install and a cold cache.
- Zero setup for a developer: `npm run db:setup && npm run dev` runs on an embedded Postgres (PGlite). Production uses Neon.
- Small dependency footprint: six runtime packages (see [architecture](architecture.md#stack)).

## Features and acceptance criteria

Limits quoted below come from the code ([queries.ts](../src/db/queries.ts), [split.ts](../src/lib/split.ts), [money.ts](../src/lib/money.ts)).

### F1. Create a trip and share the link

As an organiser, I want to create a trip and send one link to the group, so that nobody has to sign up.

- The landing page ([page.tsx](../src/app/page.tsx)) offers "Open the demo trip (Kochi, 11 friends)" and a "Start a trip" form: trip name, where you are staying, start and end date, your name, and "the others" (one per line or comma separated).
- Required: trip name (max 80 chars), base location (max 80), valid start and end dates (a real calendar date, so 31 Feb is rejected), end not before start, your name (max 40), and at least one person.
- Duplicate names (case-insensitive, whitespace collapsed) are collapsed into one.
- On success the trip, its members and the creator's identity cookie are created together and the browser lands on `/t/<slug>`. The slug is a lowercased stem of the trip name (up to 20 chars) plus five random characters, for example `goa-with-the-college-x7k2p`. The random alphabet leaves out 0, 1, i, l and o so a slug survives being read aloud.
- On a validation error the form keeps what the user typed and shows a plain-language message.
- The header "Share" button opens an "Invite the gang" sheet with the link, "Share on WhatsApp" (opens `wa.me` with "Join our trip <name> on Tripsplit: <url>"), "Copy link", and, where the browser supports it, "More apps" (the native share sheet).
- Trip pages carry Open Graph title and description so the WhatsApp preview is readable, and are marked `noindex`.

### F2. Identity without accounts

As a casual friend, I want to say who I am once and not be asked again, so that my votes and default "paid by" are mine.

- A visitor with no identity cookie for this trip sees a non-blocking "Who are you?" banner with one chip per member and an "I'm not on the list" chip that reveals a name field and a Join button.
- Picking a name or joining sets a cookie for this trip only, lasting a year, and the banner disappears immediately.
- Viewing, adding plans, locking in, deleting, and expenses work without an identity. Voting and reacting need one: tapping a vote with no identity opens a "Who are you?" sheet instead.
- The header shows "You: <name>" (linking to People) once identified. People has a "This is me" button to switch.
- If the cookie names someone who is no longer on the trip, it is ignored and the banner returns.
- Adding a name that already exists (case-insensitive) is refused with "Someone called X is already on this trip".

### F3. Plan: itinerary, options, votes, reactions, lock-in

As a group, we want to decide where to go and see the day laid out, so that the WhatsApp debate ends.

- The Plan tab shows one section per trip day, headed "Day N" with the short date (for example "Day 2 · Sat 31 Oct"), capped at 60 days. Items sort by time with untimed items last ("Any time"). A day with nothing shows "Nothing planned yet. Add the first thing."
- "Add plan" per day: time (optional, `HH:MM`), place (required, max 120), notes (optional, max 500), and a checkbox "This is an option to vote on". The day must fall inside the trip dates.
- An option shows an "Option" badge, 👍 and 👎 counts, emoji chips and a "Lock it in" button. Tapping a vote you already cast removes it. A member has at most one up/down vote and one emoji per item.
- Reactions are 🔥 😍 😴 💸 🤔 and are allowed on plans as well as options. Only emojis someone has used show as chips; the smiley-plus button opens the full set.
- "Lock it in" turns an option into a plan, one way. It needs no identity. Vote buttons are hidden after lock-in, reactions stay.
- Delete asks for confirmation. Vote and reaction taps update instantly (optimistic) and roll back with an inline error if the server refuses.

### F4. Expenses with equal, exact, shares and subset splits

As anyone on the trip, I want to log what I paid and who it was for, so that nobody does the maths later.

- Fields: amount (numeric keypad, rupees with up to two decimals), description, category (Stay 🏠, Travel 🚌, Food 🍛, Activities 🎟️), paid by (defaults to me, else the first member), date (a trip day, or "No specific day"; defaults to today in India if inside the trip, else day 1).
- Amount must be greater than 0 and at most ₹2,00,00,000. A third decimal rounds half up to the paisa.
- Split modes: Equally, Exact, Shares. Any mode can be restricted to ticked members (All and None shortcuts). At least one person is required.
- Equal: ticked people pay the same, leftover paise go by largest remainder, the form shows each person's amount.
- Shares: a stepper per person (1 to 20 in the form, up to 1000 accepted by the server) with a live per-head preview.
- Exact: an amount per ticked person, a live "₹X left to assign" or "₹X over the total", an "All assigned" state, and "Fill evenly". Saving requires the amounts to add up to the total exactly. Unreadable text in a box is flagged instead of silently counting as 0.
- The form and the server use the same functions, so the preview and the saved result never differ by a paisa.
- The list is grouped by day, newest day first, undated last, with a day subtotal. Filter chips (All, Stay, Travel, Food, Activities) change the list and the total. Each row reads "Paid by X · split among N" and opens the edit page, which also has Delete (with confirmation).
- Rejected with a friendly message: a payer or split member who is not on this trip, a date outside the trip, shares or amounts that are negative or fractional.

### F5. Settle up: minimum transfers, copy, WhatsApp, UPI

As the person who paid the homestay, I want the fewest payments that square everyone, so that collecting is a handful of messages.

- Balances list: each member's paid and share, and a pill saying "gets back ₹N", "owes ₹N" or "settled up". Sorted by balance, highest first.
- "N payments settle everyone" with one card per transfer: payer, receiver, amount, and a copy button that copies `Zoya pays Aarav ₹6,772.44`.
- N is the true minimum: non-zero balances minus the largest number of groups that cancel among themselves (checked against brute force in the tests). Above 20 people with non-zero balances it falls back to a greedy method that is correct but not always minimal.
- If the receiver has a UPI id, the card shows "Pay via UPI", a `upi://pay` link with payee, amount and the trip name filled in.
- "Copy all" and "Send on WhatsApp" share the trip name followed by every line.
- Output is deterministic: the same data gives the same list in the same order whatever order members arrive in.
- With no expenses, or everyone square, the heading reads "Everyone is settled up".
- Not in v1: marking a payment as done. The list is recomputed from expenses every time.

### F6. Summary

As an organiser, I want to see where the money went, so that the post-trip chat has facts.

- Three stat cards: Total spend, Per head (total divided by all members, rounded to the paisa), Expenses (count).
- "Where the money went": a donut and bars by category with amount and percentage.
- "Per person": a bar for the share each person consumed, with a saffron tick at what they paid.
- "Per day": a bar per day, plus "No specific day" if any expense has no date.
- All charts are hand-built SVG and CSS, readable by a screen reader through labels.

### F7. People

As a trip member, I want to add friends and my UPI id, so that late joiners are included and others can pay me.

- A card per member with avatar, name, UPI field (Save appears once edited), "This is me", and a remove button.
- UPI ids are checked for the shape `name@bank`; blank clears it.
- Add someone by name (max 40, unique case-insensitively).
- Remove works only for people who paid for nothing and sit in no split. Everyone else keeps their row, and the page says so.
- Joined people are given avatar colours from a 12-colour palette in join order.

## Success metrics

Tripsplit has no analytics in v1. The table says what a real group would show and how each number can be read today. "Needs phase N" means the app cannot yet record it.

| Metric | Target for the 11-person Kochi trip | How to read it today |
| --- | --- | --- |
| Reach: members who engage with the link | At least 9 of 11 (80%) pick a name and do something | Count distinct members in `votes` plus distinct `paid_by` in `expenses`. Opening without acting is invisible. |
| Expenses logged per trip | 20 or more over four days (the demo has 25) | `select count(*) from expenses` for the trip |
| Spread of contribution | Expenses paid by at least 6 different people | `count(distinct paid_by)`. Who typed it in is not stored. |
| Votes per option | At least 6 votes on each option (the demo has 6 on the dinner options) | `votes` grouped by plan item |
| Time to log an expense | Under 30 seconds from tapping "Add expense" to saved, on a phone | Stopwatch test on the deployed app |
| Split fidelity | 0 complaints that a split was "not how we did it"; balances sum to exactly 0 | Unit tests assert the sum; complaints are anecdotal |
| Time to settle | All payments made within 24 hours of the last expense | Needs phase 9 (no record of payments exists) |
| Reuse | The organiser starts a second trip without being asked | Count of `trips` rows from the same group, by hand |

## Risks and open questions

| Risk or question | Why it matters | Current stance |
| --- | --- | --- |
| Anyone with the link can edit or delete anything | A prankster, a leaked link or an honest mistake can wreck the data, and there is no undo | Accepted for v1 and stated on the landing page. Mitigations are phase 12 (change log, undo) and 13 (PIN). |
| Open demo trip | `/t/kochi-2026` is public and editable by every visitor | Re-running `npm run db:seed` resets it. Decide before deploying whether to keep it public. |
| Slug is the secret | Generated slugs have about 28.6 million combinations per stem (31 characters, 5 positions), and there is no rate limiting | Fine for friends, not for sensitive data. The demo slug is fixed and known. |
| Cookie identity is per browser | WhatsApp may open links in an in-app browser that does not share cookies with Chrome or Safari, so a friend may be asked "Who are you?" again | Open question. Test on both Android and iOS once deployed. |
| Rounding drift | A payment of ₹6,772.44 is not what people send on UPI | Phase 11 (round to whole rupees) |
| Concurrent edits | Two people saving at once, or editing a stale page, is last write wins; other phones only see changes after a reload | Phase 10 (live updates) |
| Mis-typed amounts | Anyone can edit an expense, so a typo silently changes who owes whom | Phase 12 (change log shows who changed what) |
| Data loss | Local PGlite data lives in `.data/` and is not backed up; Neon free tier has its own limits | Neon in production; no backups configured yet |
| Does the group trust the settle-up list? | The minimum-payments list differs from "everyone pays the payer", which may feel odd (in the demo Kabir pays Diya, not Aarav) | The note under the list explains it. Watch for confusion on the real trip. |
| Who is allowed to remove a person? | Anyone can remove an uninvolved member, including someone else | Accepted under the open model |
