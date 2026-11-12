# Prepline

A budget-aware weekly dinner planner. Pick your store, budget, diet and kitchen. Prepline plans high-protein dinners under your budget, prices every ingredient at your store, and builds one grocery list that adds up. It works offline, has no accounts, and keeps all your data on your device.

- **178 original dinners**, about half Indian (North, South, East, West), the rest from around the world. Each has 25 g+ protein per serving (estimated).
- **Mix and match**: pick any food groups (say, vegetarian + chicken) and any cuisines (say, Indian + Mediterranean). Each week blends them and stays balanced.
- **Weekly plan** under budget: lock days, regenerate the rest, and swap a meal with the new weekly total shown for each option.
- **Grocery list** merged across the week and grouped by aisle, showing what to buy and what it costs. "Have it" toggles build your pantry. Share or copy the list.
- **Prices** for 11 stores: edit any price, add ingredients, compare stores, see Costco bulk hints.
- **Live prices**: official Kroger and Walmart APIs, real shopper receipts for every chain (Open Prices), and one tap to see live prices at any store on Instacart.
- **Your recipes**: write your own, or paste recipe text and Prepline reads it for you.
- **Installable** on iPhone and Android. Light and dark mode. JSON backup and restore.

> Nutrition figures are estimates from typical ingredient values. Prices are labeled by source: **Live**, **Shoppers**, **Estimate** or **Edited**.

---

## 1. Put it online (free)

### Option A: GitHub Pages
1. Create a free account at github.com, then a new repository named `prepline` (it can be private on paid plans; public otherwise).
2. Upload this project, or run:
   ```bash
   git remote add origin https://github.com/YOUR-NAME/prepline.git
   ```
   ```bash
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. **Actions → Deploy to GitHub Pages → Run workflow.** After about 2 minutes your app is live at `https://YOUR-NAME.github.io/prepline/`.

From then on, every push and every daily price refresh republishes the site automatically.

### Option B: Cloudflare Pages
1. At dash.cloudflare.com, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repo.
2. Build command `npm run build`, output folder `dist`. Optionally add an environment variable `VITE_PRICES_API` (see section 3).
3. Deploy. Your app is live at `https://prepline.pages.dev` (or your own domain).

## 2. Install it on a phone

**iPhone / iPad (Safari)**
1. Open your app's address in **Safari**.
2. Tap **Share** (the square with an arrow), then **Add to Home Screen**, then **Add**.
3. Open Prepline from the home screen. It runs full-screen and works offline.

**Android (Chrome)**
1. Open your app's address in **Chrome**.
2. Tap **Install app** when it pops up, or **⋮ → Add to Home screen → Install**.
3. Open Prepline from your apps. It works offline.

**Family and friends:** send them the link. Everyone's data stays on their own phone. Nothing is shared between people.

## 3. Live prices

| Source | Stores | What you need | Cost |
|---|---|---|---|
| **Open Prices** (shopper receipts) | Any chain: Safeway, Aldi, Costco, Trader Joe's, Target, Walmart, Whole Foods… | Nothing, it runs daily automatically | Free |
| **Kroger API** | Kroger, Ralphs, Fred Meyer, King Soopers, Fry's, Smith's, QFC, Harris Teeter, Mariano's… | Free Kroger developer key | Free |
| **Instacart** | Costco, Aldi, Safeway/Albertsons, Publix, Sprouts, Kroger family and many more | Free Instacart developer key + price server | Free |
| **Walmart API** | Walmart (walmart.com prices) | Approved Walmart affiliate account + price server | Free |

Stores without a public price feed (H-E-B, Trader Joe's, Whole Foods, Publix, Target) show **Shoppers** prices where people have shared receipts, and **estimates** that follow the live Kroger market for everything else. Your own edits always win. Prepline does **not** scrape store websites: that breaks store terms and gets apps removed from app stores.

### 3a. Shopper prices (automatic)
The **Live prices** workflow runs every day. It downloads recent US receipt prices from [Open Prices](https://prices.openfoodfacts.org) by Open Food Facts, matches them to our ingredients, and saves `public/prices/community.json`. A price is only used when at least 2 receipts back it, the newest is under a year old, and it's within 2× of our estimate, which filters out bad product matches. Anyone can add prices with the Open Prices app, and coverage grows over time.

> Open Prices data is under the **Open Database License (ODbL)**. Keep the attribution shown in Settings. If you publish the `community.json` file itself, publish it under ODbL too.

### 3b. Kroger (daily, one ZIP, no server needed)
1. Go to **developer.kroger.com**, sign up, then **Create App**. Choose *Production* and the **Product** scope. Copy the **Client ID** and **Client Secret**.
2. In GitHub: **Settings → Secrets and variables → Actions**.
   - *Secrets* tab: add `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET`.
   - *Variables* tab: add `KROGER_ZIP` (e.g. `45202`).
3. **Actions → Live prices → Run workflow.** Kroger-family prices now show **Live**.

If a product match looks wrong, adjust its search words in `scripts/kroger-terms.ts`.

### 3c. Price server (per-person Kroger prices, Instacart, Walmart)
A tiny Cloudflare Worker in `worker/` keeps API keys secret. Keys can't go inside the app, because everyone who installs it could read them. The free Cloudflare plan is enough.

```bash
cd worker
```
```bash
npm install
```
```bash
npx wrangler login
```
```bash
npx wrangler secret put KROGER_CLIENT_ID
```
```bash
npx wrangler secret put KROGER_CLIENT_SECRET
```
```bash
npx wrangler secret put INSTACART_API_KEY
```
```bash
npx wrangler deploy
```
Wrangler prints your server address, e.g. `https://prepline-prices.YOUR-NAME.workers.dev`. Then:
- **Everyone gets it:** set the GitHub repo variable `VITE_PRICES_API` to that address (or the same variable in Cloudflare Pages) and redeploy.
- **Just you:** in the app, **Settings → Live prices**, paste the address and enter your ZIP.

What it unlocks:
- **Kroger at each person's nearest store**, by their own ZIP.
- **"See live prices at any store on Instacart"** on the grocery list: Prepline sends your list to Instacart, you pick any store near you, and Instacart shows that store's live prices (and lets you order if you want).
- **Walmart live prices**, once you have affiliate keys (below).

In `worker/wrangler.toml`, set `ALLOWED_ORIGINS` to your site address(es) so only your app can use your server.

**Instacart key:** sign up for the Instacart Developer Platform, create a *development* key (set `INSTACART_BASE = "https://connect.dev.instacart.tools"` while testing), then request a *production* key and switch back to `https://connect.instacart.com`. Read Instacart's developer terms before publishing.

**Walmart (optional):** apply to the Walmart affiliate program, then register at walmart.io. Generate an RSA key pair:
```bash
openssl genrsa -out walmart_private.pem 2048
```
```bash
openssl rsa -in walmart_private.pem -pubout -out walmart_public.pem
```
```bash
openssl pkcs8 -topk8 -nocrypt -in walmart_private.pem -out walmart_private_pkcs8.pem
```
Upload the public key at walmart.io, then add `WALMART_CONSUMER_ID`, `WALMART_KEY_VERSION` and `WALMART_PRIVATE_KEY` (paste the PKCS#8 file contents) as Worker secrets. The adapter follows Walmart's published affiliate spec. Check the endpoint against your walmart.io dashboard the first time.

## 4. Publishing to the App Store and Google Play

The app-store versions are the same app wrapped with [Capacitor](https://capacitorjs.com) (free).

**Costs:** Google Play is a **$25 one-time** fee. Apple's Developer Program is **$99 per year**, which Apple requires for any App Store app. Everything else is free.

```bash
npm run build:store
```
The store build turns store logos off by default, skips the web service worker, and reads daily prices from your published site. Set `VITE_PRICES_BASE=https://YOUR-SITE/` and `VITE_PRICES_API=…` when building.

**Android** (Windows, Mac or Linux, with Android Studio):
```bash
npx cap add android
```
```bash
npm run cap:sync
```
```bash
npx cap open android
```
In Android Studio: **Build → Generate Signed App Bundle**, then upload it at play.google.com/console. Use **Internal testing** to share free with up to 100 family and friends before going public.

**iPhone** (needs a Mac with Xcode):
```bash
npx cap add ios
```
```bash
npm run cap:sync
```
```bash
npx cap open ios
```
In Xcode: set your team, then **Product → Archive → Distribute**. Use **TestFlight** to share free with family and friends (up to 10,000 testers).

Before submitting:
- Change `appId` in `capacitor.config.ts` to a reverse domain you own.
- Privacy policy URL: `https://YOUR-SITE/privacy.html` (included).
- Add `capacitor://localhost` and `https://localhost` to the Worker's `ALLOWED_ORIGINS`.
- **Store logos** are off in store builds. Apple and Google can reject apps that show other companies' logos without permission.
- Apple's guideline 4.2 rejects apps that are only a website. Prepline's offline planning, grocery list and on-device storage help, but expect Apple to look closely.

## 5. Feedback, accounts and payments

Testers tap **Settings → Send feedback**. Notes land in your Cloudflare account
(**Storage & databases → Workers KV → prepline-feedback**), set up automatically by the
*Deploy price server* workflow. Sign-in and paid plans aren't switched on yet. The plan and the
app-store rules are in [docs/ACCOUNTS-AND-PAYMENTS.md](docs/ACCOUNTS-AND-PAYMENTS.md).

## 6. Your data
Everything lives in your browser or app (IndexedDB). **Settings → Your data → Export backup** saves a JSON file, and **Import backup** restores it (for example, on a new phone). There are no accounts and no analytics. See `public/privacy.html`.

## Develop

```bash
npm install
```
```bash
npm run dev
```
```bash
npm test
```
```bash
npm run build
```

| Command | What it does |
|---|---|
| `npm run prices:community` | Rebuild shopper prices from Open Prices |
| `npm run prices:kroger` | Rebuild `live.json` (needs `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, `KROGER_ZIP`) |
| `npm run deploy:worker` | Deploy the price server |
| `npm run build:store` | App-store build (Capacitor) |

On a network that needs a proxy, run the price scripts with `NODE_USE_ENV_PROXY=1`.

### Project map
- `src/engine/`: cost engine, plan generator, diet filters, price resolution, unit and size parsing, store adapters (Kroger, Walmart, Instacart, Open Prices). All unit-tested.
- `src/data/`: ingredients with nutrition and seed prices, 11 stores, 178 recipes.
- `src/import/`: offline recipe-text parser and the **AI import extension point** (`aiImport.ts`).
- `src/ui/`: screens. `src/state/`: app state and live-price loading. `src/db/`: IndexedDB and backup.
- `scripts/`: daily price jobs. `worker/`: price server. `.github/workflows/`: daily prices and deploy.

## Trademarks and data
Store names and logos (in `src/assets/logos/`) belong to their owners and are used only to identify which store a price refers to. Prepline is an independent project and is not affiliated with or endorsed by any retailer. Shopper prices: Open Prices by Open Food Facts, ODbL. All recipes are original to Prepline.
