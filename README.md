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

## Trademarks
Store names and logos (in `src/assets/logos/`) belong to their respective owners and are used only to identify which store a price refers to. Prepline is an independent personal project and is not affiliated with or endorsed by any retailer.
