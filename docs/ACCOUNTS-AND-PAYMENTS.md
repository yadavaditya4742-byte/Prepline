# Accounts, payments and feedback

Prepline is in **beta**: no sign-in, everything free, all data on the phone.
This page is the plan for later, plus how to read the feedback people send today.

## What's already built (groundwork)

| Piece | Where | What it does now | What it does later |
|---|---|---|---|
| Install ID | `src/account/account.ts` | Random ID per phone, not tied to a person. Groups feedback from one phone. | Linked to the account when someone signs in. |
| Plans | `Plan = 'free' \| 'friends' \| 'pro'` | Everyone is `free`, reason `beta`. | `pro` after a purchase, `friends` for free invites. |
| Feature gate | `can(account, feature)` | Always `true` (`IS_BETA = true`). | Screens check `can('receipt-scan')` etc.; flip `IS_BETA` and list paid features in `PAID_FEATURES`. |
| Feedback | Settings → Send feedback | Saved to Cloudflare KV `prepline-feedback`; queued on the phone if offline. | Same. |

## Reading feedback

1. Go to **dash.cloudflare.com** → **Storage & databases** → **Workers KV**.
2. Open **prepline-feedback** → **KV Pairs**.
3. Each key starts with `fb:` then date, type and the first words, e.g.
   `fb:2026-11-14T18:02:11:idea:3f9a1c More paneer dinners please`. Click it to read the full note.
   (`rl:` keys are short-lived spam counters; ignore them.)

Free limits: 1,000 new notes a day, far more than a beta needs.

## Later: sign-in (ID + password)

Don't store passwords ourselves. Use a hosted sign-in service with a free tier:

- **Supabase Auth** (free tier covers tens of thousands of monthly users; email + password, Apple, Google), or
- **Firebase Authentication** (similar).

App-store rules to plan for:

- **Account deletion** inside the app is required if people can create an account (Apple guideline 5.1.1(v); Google Play has the same rule).
- If you offer **Sign in with Google**, Apple also requires an equivalent private option; **Sign in with Apple** satisfies it.
- Keep "use without an account" so the free planner still works offline. Sign-in should add things (sync across phones, paid plan), not block the app.
- Update `public/privacy.html` and the store privacy labels (email collected, used for account only).

## Later: payments

- On iPhone and Android, digital subscriptions go through **Apple In-App Purchase** and **Google Play Billing**. Small developers pay a **15%** fee (Apple Small Business Program, Google's subscription rate).
- **RevenueCat** wraps both stores in one SDK with a single "is this person pro?" answer. It's free until your app makes about $2,500 a month.
- The web version (GitHub Pages) can stay free, or use Stripe later.
- Accounts cost: Apple Developer **$99/year**; Google Play **$25 once**.

## Free access for family & friends

Pick one when the time comes:

1. **Store promo codes:** Apple *offer codes* and Google Play *promo codes* give a free subscription period. No code changes needed.
2. **Invite codes on our server:** a `friends` plan unlocked by a code checked by the price server. More work, but no expiry and no store limits.

## Order of work when you're ready

1. Test the beta yourself and collect feedback (now).
2. Enroll in Apple Developer and Google Play; package with Capacitor.
3. Add sign-in (Supabase) + in-app account deletion + privacy-policy update.
4. Add RevenueCat, choose which features are `PAID_FEATURES`, set `IS_BETA = false`.
5. Hand out promo/offer codes to family & friends.
