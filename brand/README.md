# Tripsplit brand

## The idea

The mark is the balance river from the Settle screen, reduced to four people. A zero line runs down the middle.
Two people get back money, so their bars grow right in teal. Two owe, so their bars grow left in ink. The rows are
sorted the way the app sorts them, biggest "gets back" at the top, biggest "owes" at the bottom. The two sides
add up to the same length (14 + 6 on the right, 6 + 14 on the left), because on every trip what is owed equals what
is owed back. That is the whole promise of the product, drawn as the product draws it.

Two side effects help: the stepped diagonal reads as an S for split, and the mark looks the same when turned
upside down, which is what a settled balance feels like.

The wordmark is "Tripsplit" in Manrope SemiBold (600), the UI's own typeface, converted to outlines. No font is
needed to show any file in this folder.

## Files

| File | What it is |
|---|---|
| `logo.svg` | Mark and wordmark, colour, for light grounds |
| `logo-dark.svg` | The same for dark grounds |
| `mark.svg` | Mark alone, colour |
| `mark-mono.svg` | Mark alone in `currentColor` (one colour: black, white, teal, anything) |
| `favicon.svg` | Mark redrawn on a 16 px grid for tab icons; switches colours in dark mode |
| `icon-32.png`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` | App icons. 180, 192 and 512 sit on the ground colour with the mark at 56 %, inside the maskable safe zone |
| `app-icon.svg` | Source of the square app icons |
| `og.svg` / `og.png` | 1200 x 630 social image. `og.svg` is the source (outlines only) |
| `preview.png`, `preview-16px.png` | Review sheet: 16, 32, 64, 256 px in colour, black on white, white on black, header mocks, logo, and an 8x zoom of the 16 px favicon |

## Colours

| Role | Light | Dark |
|---|---|---|
| Gets back bars (backwater teal, `--accent`) | `#0f766e` | `#5fd0c2` |
| Owes bars and zero line (ink, `--text`) | `#1b1d1f` | `#f2f4f5` |
| Ground (`--ground`) | `#f3f5f4` | `#0e0f10` |
| Tagline grey (`--muted`) | `#5c6064` | `#a9aeb2` |

One colour is always fine: all ink, all white, or all teal. Never use gradients, glows or shadows on the mark,
and no violet or indigo.

## Grid, clear space, minimum size

- The mark is drawn on a 32 unit grid: zero line 2 units wide at x 15 to 17, bars 6 units tall with 2 unit gaps,
  1.5 unit radius on the outer ends only.
- Clear space: at least 8 units of the 32 unit grid (a quarter of the mark's height) on every side.
- In the logo the gap between mark and wordmark is 9 units and the wordmark's cap height is about 19 units.
- Minimum size: 16 px for the mark (use `favicon.svg`, which is hinted for that size), 20 px for the mark next to
  the wordmark in UI, 96 px wide for the full logo.

## Do and don't

Do
- Put the mark in teal next to "Tripsplit" at 16 px / 600 in the header (this is `MarkIcon` in
  `src/components/icons.tsx`, 20 to 28 px, `currentColor`).
- Use the one-colour mark on photos or on teal (white mark).
- Keep the right bars teal and the left bars ink in the two-colour version, the same as the Settle screen.

Don't
- Mirror the mark, reorder the bars, or change their lengths (the sides must stay equal).
- Put the mark inside a rounded square with a letter, add a shield, sparkle or any other badge.
- Recolour the bars by person or category, or swap teal and ink.
- Set the wordmark in another typeface or in all caps.

## Where it is wired into the app

- `src/app/icon.svg`: copy of `favicon.svg` (Next.js icon file convention)
- `src/app/apple-icon.png`: copy of `apple-touch-icon.png`
- `src/app/opengraph-image.png` and `src/app/twitter-image.png` (+ `.alt.txt`): copies of `og.png`
- `src/app/manifest.ts`: name, colours, and `public/icons/icon-192.png` and `icon-512.png`
- `src/components/icons.tsx`: `MarkIcon`, the same paths in `currentColor`

## The two alternatives

Both are in `alternatives/`, each with `logo.svg`, `mark.svg`, `mark-mono.svg` and `preview.png`.

- `wordmark-slice`: "tripsplit" in lowercase Manrope Bold, cut along half the x-height. The top half slides
  right in teal, the bottom half slides left in ink, which is the river's right and left. The small mark is the
  sliced "t". Weak spot: at small sizes the top of the "t" can read as a plus sign.
- `torn-ticket`: a trip ticket torn along a perforation, the stub dropped away in teal as a share being handed
  out. Strong at 16 px as two blocks; less specific to money than the river.

### How to swap

1. Copy the alternative's `mark.svg` paths into `MarkIcon` in `src/components/icons.tsx` (keep `viewBox="0 0 32 32"`,
   `fill="currentColor"` and the props; drop the fixed fills).
2. Rebuild `favicon.svg`, the PNG icons and `og.png` from the alternative's mark, then copy them over
   `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/opengraph-image.png`, `src/app/twitter-image.png` and
   `public/icons/`. The build scripts used for this set place the mark in the same positions, so only the paths
   change.
3. Update this README.

Copyright: © 2026 Steve Mathai Mathew. All rights reserved.
