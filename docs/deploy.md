# Deploy checklist: Vercel and Neon

This is the owner's ordered checklist for the first production deploy (phase 8 in [phases.md](phases.md)). Run the steps in order. Each step uses the owner's own Neon and Vercel accounts, so nothing here is automated.

Secrets stay out of git. The Neon connection string goes in `.env.local` on your machine (git-ignored) and in the Vercel project settings. Never paste it into a committed file, a doc, or a chat.

## 1. Create the Neon database

1. Sign in at neon.tech and create a project.
2. Choose the Singapore region (ap-southeast-1). The function region in step 5 is chosen to sit next to it.
3. Copy the connection string. It starts with `postgresql://`.

## 2. Create the tables and seed the demo from your machine

1. In the repo folder, run `Copy-Item .env.example .env.local` in PowerShell.
2. Open `.env.local` and set `DATABASE_URL` to the Neon connection string.
3. Confirm the file is ignored by git. Run `git check-ignore .env.local`. It must print `.env.local`.
4. Run `npm run db:setup` in PowerShell. This applies the migrations to Neon and then seeds the demo.
5. Expect a line starting with `Seeded /t/kochi-2026` that reports 11 members, 26 plan items and 25 expenses.

If `DATABASE_URL` is missing from `.env.local`, the commands write to the local database in `.data` instead of Neon. Neon then stays empty, and nothing fails to tell you so.

## 3. Import the repo on Vercel

1. Confirm the repo is on GitHub as `steve-mathai/tripsplit`.
2. Open vercel.com/new and import `steve-mathai/tripsplit`.
3. Keep the framework preset as Next.js and the root directory as the repo root. The root `vercel.json` sets the function region.
4. Vercel starts a build as soon as the project is imported. Let it finish or cancel it. The variables in step 4 are added next, and then the app is redeployed.

## 4. Add the environment variables

In the Vercel project, open Settings, then Environment Variables.

1. Add `DATABASE_URL` with the Neon connection string. Set it for Production and Preview.
2. Add `NEXT_PUBLIC_SITE_URL` with the live URL, for example `https://tripsplit.vercel.app`. Set it for Production. Use the real URL that the first deployment shows. The value is baked in at build time, so a redeploy is needed after it changes.
3. Optionally add `RATE_LIMIT_SALT` with a long random string from a password manager. Set it for Production. If it is left out, the app derives the salt from `DATABASE_URL`, so IP hashes are still salted. Changing either value changes the salt, and the rate-limit counters then start again from zero.
4. `DEMO_READ_ONLY` is optional and not needed here. The demo trip is read-only automatically when Vercel sets `VERCEL_ENV` to `production`. Set `DEMO_READ_ONLY=1` only to make a non-production deployment read-only as well.

## 5. Confirm the function region

`vercel.json` at the repo root sets the function region to `sin1` (Singapore). After the deploy, check the deployment details in the Vercel dashboard and confirm `sin1` is listed.

## 6. Deploy

1. Open the Deployments tab and redeploy the latest build, so the new variables take effect.
2. If the WhatsApp link preview still shows `localhost` after the redeploy, redeploy again with the build cache turned off.

## 7. Reseed the demo (when needed)

`npm run db:seed` deletes the demo trip and everything under it, then recreates it from the demo data. Any edits made to the demo are lost.

1. Make sure `.env.local` holds the Neon `DATABASE_URL`.
2. Run `npm run db:seed` in PowerShell.
3. Expect the same `Seeded /t/kochi-2026` line as in step 2.

## 8. Phase 8 acceptance checks

Run these against the production URL after the deploy.

1. Open `/t/kochi-2026` on the production URL. All five tabs load, and the Expenses tab lists 25 expenses.
2. On a phone over mobile data, create a trip. Share its link into a WhatsApp chat and check that the preview shows the trip name and dates.
3. Add an expense with a 4-way split. In the Neon console, check that four split rows exist for it. Then submit a deliberately invalid expense, for example one with an impossible date, and check that no expense or split rows were left behind.
4. Only on a Preview deployment: remove `DATABASE_URL` from the Preview variables, redeploy, and open a trip page. Check that the error "DATABASE_URL is not set" appears. The error shows on the first database access, not at startup. Restore the variable afterwards.
5. Open the link from WhatsApp on one Android phone and one iPhone. Check whether the identity cookie survives the move from the in-app browser to the default browser. Record the answer in [memory.md](memory.md).
6. Decide whether the demo trip stays public and editable. Record the decision in [memory.md](memory.md). The reset command is in step 7.
