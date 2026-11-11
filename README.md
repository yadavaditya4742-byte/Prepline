# Prepline

A budget-aware weekly dinner planner that runs entirely on your device: no accounts, no backend, no paid APIs.

> Work in progress. Install steps for iPhone and Android and the deploy guide arrive in the final stage.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (cost engine, prices, diet filters, library, storage)
npm run build    # type-check + production build into dist/
```

## Data notes
- **Prices** are estimates unless marked *Live* (Kroger family, via Kroger's free public API) or *Edited* (your own value).
- **Nutrition** figures are estimates computed from typical ingredient values.
- Everything you enter is stored locally in your browser (IndexedDB). Use Settings → Backup to export a JSON file.

## Live prices (Kroger family)

Kroger runs a free public developer API, so Kroger-family stores (Kroger, Ralphs, Fred Meyer, King Soopers, Fry's, Smith's, QFC, Harris Teeter, Mariano's, Dillons, Food 4 Less…) can have **live prices**. Other chains don't offer a public price feed, so their prices are **estimates** that follow the live Kroger market for the same item, and anything you edit wins.

How it works: a GitHub Action (`.github/workflows/kroger-prices.yml`) runs once a day, looks up every ingredient at your nearest Kroger-family store, and commits `public/prices/live.json`. The app loads that file on start and keeps the last good copy for offline use. It costs nothing to run.

One-time setup (about 10 minutes):
1. Go to **developer.kroger.com**, create a free account, then **Create App**. Choose the *Production* environment, scope **Product** (public/compact is enough). Copy the **Client ID** and **Client Secret**.
2. In your GitHub repo: **Settings → Secrets and variables → Actions**.
   - *Secrets* tab → add `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET`.
   - *Variables* tab → add `KROGER_ZIP` (your ZIP code). Optionally `KROGER_LOCATION_ID` to pin one exact store.
3. **Actions → Kroger prices → Run workflow** to fetch the first prices now. After that it runs daily.

Run it on your own computer instead:
```bash
KROGER_CLIENT_ID=... KROGER_CLIENT_SECRET=... KROGER_ZIP=45202 npm run prices:kroger
```
If the job picks a wrong product for an item, adjust its search words in `scripts/kroger-terms.ts`.

Price labels in the app:
- **Live**: today's Kroger price at your store.
- **Est. · live-tracked**: our estimate for this store, scaled by today's live Kroger price for the same item.
- **Estimate**: typical shelf price, late 2026.
- **Edited**: the price you entered. It always wins; reset it any time.

## Trademarks
Store names and logos (in `src/assets/logos/`) belong to their respective owners and are used only to identify which store a price refers to. Prepline is an independent personal project and is not affiliated with or endorsed by any retailer.
