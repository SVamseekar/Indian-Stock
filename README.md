# Indian Stock — Fair Value Workspace

A React/TypeScript workspace for understanding Indian equity prices through the **video’s demonstrated two-component EMP calculation** and a separate **historical mean P/E comparison**. It includes reviewed financial text imports, an earnings builder, valuation scenarios, stock comparisons and a browser-local portfolio.

## Run

Use Node.js 22.12+ (Node 24 LTS is also suitable).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The Express server supplies `/api/*` and Vite serves the UI. No API key is needed for optional Yahoo Finance quotes.

For a production server:

```sh
npm run build
NODE_ENV=production HOST=0.0.0.0 npm start
```

Set `PORT` for your hosting platform. Keep this server running: deploying only `dist/` does not provide quote/search endpoints. `npm run preview` is a static UI preview only. Source and development tools must remain installed for `npm start`, which uses the TypeScript loader.

## Video EMP mode

The public video slides were inspected directly. At11:07, the example uses reference price200, reference EPS10 and supplied baseline120. Earnings sensitivity is `(200 −120)/10=8`; new TTM EPS15 produces `120+15×8=240`. At13:30, previous-quarter price deviation10 and multiplier3 produce low210 and high270.

The new default Video EMP tab reproduces this arithmetic:

- Earnings sensitivity = (reference price − supplied baseline) / reference TTM EPS.
- EMP = supplied baseline + updated TTM EPS × earnings sensitivity.
- Low/High = EMP ± multiplier × previous-quarter **price** standard deviation in rupees. Negative lower bands are explicitly clamped to zero.
- The baseline and price deviation are never derived from historical mean P/E or P/E dispersion. Missing parameters block video valuation rather than silently substituting another model.
- Updated EPS may be zero or negative if the final EMP remains positive. The reference EPS must be positive for the demonstrated sensitivity calculation.
- Optional quarter-price input computes deviation using an explicitly selected sample or population denominator. The video does not specify that convention.
- “Load video example” is a separate tutorial. It cannot overwrite the selected company’s financial record.
- Saved per-stock parameters persist locally. Comparisons, hypothetical EPS scenarios and portfolio model values use the selected valuation method. Existing saved prices continue to determine position values.

Vivekam’s [stock services](https://www.vivekam.co.in/stock-services/) describe Snapshot, Stock Forecaster and growth/scope-based rankings; its [portfolio services](https://www.vivekam.co.in/portfolio-services/) describe ongoing TTM-based assessment. Its [2025 PMS disclosure](https://www.vivekam.co.in/wp-content/uploads/2025/04/20VivekamPMSDraftDisclosure.pdf), pages9–10, describes a business-value/profit-sensitive split and current versus previous TTM results. These sources do not disclose the baseline algorithm or establish Gemini’s suggested regression recipe as Vivekam’s implementation. The live dashboard requires account access.

## Historical P/E comparison and limits

- Central value = positive TTM EPS × positive historical **arithmetic mean** P/E.
- Lower band = EPS × max(0, mean P/E − k × sample standard deviation).
- Upper band = EPS × (mean P/E + k × sample standard deviation).
- Sample variance uses n − 1. At least two consistent positive P/E observations are required by the raw builder. Zero deviation is valid and produces equal bands; z-score and percentile are then undefined.
- Financial calculations preserve JavaScript double precision internally; formatting to rupees/percentages happens only in the UI. Overflow and nonfinite outputs are rejected.
- A negative mathematical lower band is explicitly clamped at zero. The distance as a percentage of that zero band is undefined, represented as `null` rather than infinity.
- Normal-model coverage is `100 × (2Φ(k) − 1)`. At k=1.96 it is about 95%; this is **not** a future recovery probability, an empirical hit rate, or a confidence interval for a population mean.
- Classification describes price position relative to the model. It does not issue automatic buy/sell recommendations.
- Future EPS scenarios compound annual growth without intermediate rounding. They do not forecast market prices.

The [reference video](https://www.youtube.com/watch?v=CboJkEiyR08) discusses a proprietary EMP method with profit-sensitive and profit-insensitive components. This app cannot reproduce undisclosed coefficients or claim equivalence. The app reproduces the demonstrated arithmetic with supplied parameters and also retains the independently reproducible P/E comparison. It does not claim to derive Vivekam’s proprietary baseline or inherit its reported hit rates.

## Data workflow

1. Choose the **supplied repository snapshot**, or import your own sourced financial inputs.
2. Review the market price, reported TTM EPS, historical mean P/E, and dispersion. Record a source link and financial period when available.
3. For raw quarterly profit, use four consecutive quarters of attributable earnings with a consistent weighted-average share denominator and split/bonus adjustments. If shares changed, use comparable reported EPS instead of dividing by current shares.
4. Save your model. Comparisons, charts and portfolio all use those saved inputs.
5. Refresh optional provider quotes. The quote and its market timestamp are shown separately. Choose **Use quote in this model**, then save to update the valuation and portfolio. This deliberate step prevents quote polling from overwriting edits or silently pairing a recent price with unreviewed earnings.

### Data provenance

`src/data/defaultStocks.ts` contains the **supplied repository snapshot:32 stocks and288 quarterly observations**, retained without changing numeric values. Prices, fundamentals and historical observations have no verifiable source dates and must not be treated as a current financial feed. API and UI consumers identify these as repository data. Full stock data displays every financial metric and the original stored EMP, low and high values. Recomputed P/E comparisons are separate; retrospective calculations are not a point-in-time backtest. Editing a record preserves its financial metrics/history, and the original snapshot remains independently accessible. Unknown custom metrics are null rather than fabricated zeros.

Imported records are user inputs, not automatically verified financial facts. Missing core inputs block valuation; missing history remains empty. Source links record provenance without asserting that the app verified the filing.

The text importer accepts explicitly labelled TTM EPS. It does not infer TTM EPS from arbitrary annual/quarterly EPS rows, current P/E, or an assumed share count. A raw profit row must be explicitly labelled `Quarterly Net Profit:` and contain exactly four numeric values, including losses and zeros. Ambiguous rows show review instructions.

Automatic financial statement ingestion is **not configured**. A production fundamentals feed needs a provider that supplies attributable earnings, share adjustments, reporting periods, and a compatible historical P/E series. The app never fabricates these values for newly searched companies.

### Quote service

- Optional Yahoo Finance chart/search endpoints, which can be delayed, rate limited, changed or unavailable. This is not an exchange-certified live feed.
- Strict NSE/BSE symbol normalization; exchange suffixes remain separate cache keys.
- Positive finite prices, INR currency, exact symbol identity and provider market timestamps are required.
- 30-second cache, concurrent-request coalescing, up to two attempts and a five-second timeout per attempt. HTTP rate-limit responses are not retried immediately.
- Quotes with market timestamps older than 24 hours are labelled stale, including around market closures. A failed refresh may return a stale cached quote with its **original** timestamp; it never substitutes example prices or refreshes a stale timestamp.
- Previous close and price change remain `null` when not supplied.
- Batch requests accept at most 40 tickers and fetch at most four concurrently per batch. An overall 20-second deadline preserves completed quotes and stops scheduling after timeout or disconnect. The UI filters custom/invalid symbols, canonicalizes NSE aliases, deduplicates symbols and refreshes every chunk with a separate 25-second request deadline. Quote refresh is opt-in; auto-refresh runs every 60 seconds while the page is visible, and the client prevents overlapping requests.

## API

| Route                                           | Purpose                                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                               | Server health and configured feed types                                                                        |
| `GET /api/stocks`                               | Labelled repository records and valuations from the shared engine                                              |
| `GET /api/stocks/:symbol`                       | Optional provider quote plus repository fundamentals only when available; unknown symbols return `stock: null` |
| `GET /api/live-quotes?tickers=TCS.NS,500112.BO` | Per-symbol quote availability, provenance and timestamps                                                       |
| `GET /api/search-tickers?q=tata`                | Indian exchange search, with local-example fallback clearly identified                                         |

Unknown `/api` routes return JSON 404 responses. Invalid query types, symbols and oversized batches return HTTP 400.

## Storage and checks

Manual models and portfolio holdings persist in this browser's local storage; no account or cloud persistence is implied. Missing portfolio models are explicitly excluded from totals. Export a model as JSON for a copy outside this browser.

```sh
npm run lint
npm test
npm run build
# Or run all three:
npm run check
```

The regression suite checks valuation boundaries and precision, normal-coverage interpretation, invalid inputs, quarterly losses, conservative imports, quote metadata/cache failures, NSE/BSE isolation, unknown-stock responses and portfolio calculations. GitHub Actions runs the checks with a locked dependency install.

References: [NIST normal CDF](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3671.htm), [IAS 33 EPS](https://www.ifrs.org/issued-standards/list-of-standards/ias-33-earnings-per-share.html/).
