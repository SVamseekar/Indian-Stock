import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { DEFAULT_STOCKS } from './src/data/defaultStocks.ts';
import { StockData } from './src/types/stock.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Preloaded high-accuracy datasets for Indian stocks
const STOCK_DATABASE: Record<string, StockData> = {};
DEFAULT_STOCKS.forEach((stock) => {
  STOCK_DATABASE[stock.ticker.toUpperCase()] = { ...stock };
});

// Cache for live price quotes (10-second TTL)
interface CachedQuote {
  price: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  change?: number;
  changePercent?: number;
  timestamp: number;
}
const quoteCache: Record<string, CachedQuote> = {};
const CACHE_TTL_MS = 10000; // 10 seconds

// Helper to fetch live quote from Yahoo Finance for an Indian ticker
async function fetchYahooQuote(rawTicker: string): Promise<CachedQuote | null> {
  const cleanTicker = rawTicker.toUpperCase().replace('.NS', '').replace('.BO', '');
  const now = Date.now();

  // Return cached if fresh
  if (quoteCache[cleanTicker] && (now - quoteCache[cleanTicker].timestamp) < CACHE_TTL_MS) {
    return quoteCache[cleanTicker];
  }

  const yahooTicker = rawTicker.endsWith('.NS') || rawTicker.endsWith('.BO') ? rawTicker : `${cleanTicker}.NS`;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = Number(meta.regularMarketPrice.toFixed(2));
        const prevClose = meta.chartPreviousClose || meta.previousClose || price;
        const change = Number((price - prevClose).toFixed(2));
        const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

        const result: CachedQuote = {
          price,
          previousClose: prevClose,
          dayHigh: meta.regularMarketDayHigh || price,
          dayLow: meta.regularMarketDayLow || price,
          change,
          changePercent,
          timestamp: now,
        };

        quoteCache[cleanTicker] = result;

        // Also update stock in memory if it's in our database
        if (STOCK_DATABASE[cleanTicker]) {
          STOCK_DATABASE[cleanTicker].cmp = price;
        }

        return result;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch live quote for ${yahooTicker}:`, err);
  }

  // Fallback to cached or database value if available
  if (STOCK_DATABASE[cleanTicker]) {
    return {
      price: STOCK_DATABASE[cleanTicker].cmp,
      timestamp: now,
    };
  }

  return null;
}

// API: Batch Live Quotes for auto-updating dashboard
app.get('/api/live-quotes', async (req: Request, res: Response) => {
  const tickersQuery = (req.query.tickers as string) || '';
  const tickersList = tickersQuery
    ? tickersQuery.split(',').map((t) => t.trim().toUpperCase())
    : Object.keys(STOCK_DATABASE);

  const results: Record<string, any> = {};

  // Fetch quotes concurrently
  await Promise.all(
    tickersList.map(async (ticker) => {
      const quote = await fetchYahooQuote(ticker);
      if (quote) {
        const stock = STOCK_DATABASE[ticker];
        const ttmEps = stock ? stock.ttmEps : 50;
        const peFair = stock ? stock.peMean3Y : 25;
        const peStdDev = stock ? stock.peStdDev : 3;

        const emp = Math.round(ttmEps * peFair);
        const empHigh = Math.round(ttmEps * (peFair + 1.96 * peStdDev));
        const empLow = Math.round(ttmEps * (peFair - 1.96 * peStdDev));

        results[ticker] = {
          ticker,
          cmp: quote.price,
          previousClose: quote.previousClose,
          dayHigh: quote.dayHigh,
          dayLow: quote.dayLow,
          change: quote.change || 0,
          changePercent: quote.changePercent || 0,
          emp,
          empHigh,
          empLow,
          discountToEmp: Number((((quote.price - emp) / emp) * 100).toFixed(1)),
          discountToEmpLow: Number((((quote.price - empLow) / empLow) * 100).toFixed(1)),
          timestamp: quote.timestamp,
        };
      }
    })
  );

  res.json({
    success: true,
    count: Object.keys(results).length,
    lastUpdated: new Date().toISOString(),
    quotes: results,
  });
});

// API: Search Indian stocks on NSE/BSE
app.get('/api/search-tickers', async (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').trim();
  if (!q) {
    return res.json({ success: true, results: [] });
  }

  // 1. Check local preloaded stocks first
  const localMatches = Object.values(STOCK_DATABASE).filter(
    (s) => s.ticker.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase())
  ).map((s) => ({
    symbol: `${s.ticker}.NS`,
    ticker: s.ticker,
    name: s.name,
    exchange: 'NSE',
    sector: s.sector,
    isPreloaded: true,
    cmp: s.cmp,
    fairPrice: Math.round(s.ttmEps * s.peMean3Y),
  }));

  // 2. Query free Yahoo Finance search
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
    const yfRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (yfRes.ok) {
      const data = await yfRes.json();
      const quotes = data?.quotes || [];
      const remoteMatches = quotes
        .filter((item: any) => item.symbol && (item.symbol.endsWith('.NS') || item.symbol.endsWith('.BO') || item.exchDisp === 'NSE' || item.exchDisp === 'BSE'))
        .map((item: any) => {
          const ticker = item.symbol.replace('.NS', '').replace('.BO', '');
          const existing = STOCK_DATABASE[ticker];
          return {
            symbol: item.symbol,
            ticker,
            name: item.longname || item.shortname || item.symbol,
            exchange: item.exchDisp || 'NSE',
            sector: item.sectorDisp || item.industryDisp || 'Equities',
            isPreloaded: Boolean(existing),
            cmp: existing?.cmp,
            fairPrice: existing ? Math.round(existing.ttmEps * existing.peMean3Y) : undefined,
          };
        });

      // Merge and deduplicate by ticker
      const combined = [...localMatches];
      for (const rm of remoteMatches) {
        if (!combined.some((c) => c.ticker === rm.ticker)) {
          combined.push(rm);
        }
      }

      return res.json({ success: true, results: combined.slice(0, 8) });
    }
  } catch (err) {
    console.warn('Search query error:', err);
  }

  res.json({ success: true, results: localMatches });
});

// API: List all stocks with live prices
app.get('/api/stocks', async (req: Request, res: Response) => {
  const list = Object.values(STOCK_DATABASE).map((s) => {
    const quote = quoteCache[s.ticker];
    const liveCmp = quote ? quote.price : s.cmp;

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      cmp: liveCmp,
      previousClose: quote?.previousClose,
      changePercent: quote?.changePercent || 0,
      ttmEps: s.ttmEps,
      peMean3Y: s.peMean3Y,
      peMean5Y: s.peMean5Y,
      peStdDev: s.peStdDev,
      emp: Math.round(s.ttmEps * s.peMean3Y),
      empHigh: Math.round(s.ttmEps * (s.peMean3Y + 1.96 * s.peStdDev)),
      empLow: Math.round(s.ttmEps * (s.peMean3Y - 1.96 * s.peStdDev)),
      discountToEmp: Number((((liveCmp - s.ttmEps * s.peMean3Y) / (s.ttmEps * s.peMean3Y)) * 100).toFixed(1)),
      discountToEmpLow: Number((((liveCmp - s.ttmEps * (s.peMean3Y - 1.96 * s.peStdDev)) / (s.ttmEps * (s.peMean3Y - 1.96 * s.peStdDev))) * 100).toFixed(1)),
    };
  });

  res.json({ success: true, count: list.length, stocks: list });
});

// API: Get stock details with live quote
app.get('/api/stocks/:ticker', async (req: Request, res: Response) => {
  const cleanTicker = req.params.ticker.toUpperCase().replace('.NS', '').replace('.BO', '');
  let stock = STOCK_DATABASE[cleanTicker];

  // Fetch live price
  const quote = await fetchYahooQuote(cleanTicker);

  if (stock) {
    if (quote) {
      stock = { ...stock, cmp: quote.price };
    }
    return res.json({ success: true, stock, quote });
  }

  // If not preloaded, dynamically construct from Yahoo Finance live data!
  if (quote) {
    const estimatedEps = Number((quote.price / 25).toFixed(2)); // baseline 25x multiple estimate
    const dynamicStock: StockData = {
      ticker: cleanTicker,
      name: `${cleanTicker} Ltd`,
      sector: 'NSE Equities',
      cmp: quote.price,
      ttmEps: estimatedEps,
      peMean3Y: 25.0,
      peMean5Y: 25.0,
      peStdDev: 3.5,
      peMin: 18.0,
      peMax: 35.0,
      roce: 18.0,
      roe: 16.0,
      salesGrowth3Y: 12.0,
      profitGrowth3Y: 10.0,
      debtToEquity: 0.1,
      historicalQuarters: [
        { quarter: 'Q1', ttmEps: Number((estimatedEps * 0.88).toFixed(2)), cmp: Number((quote.price * 0.9).toFixed(2)), emp: Number((estimatedEps * 0.88 * 25).toFixed(2)), empHigh: Number((estimatedEps * 0.88 * 31.86).toFixed(2)), empLow: Number((estimatedEps * 0.88 * 18.14).toFixed(2)) },
        { quarter: 'Q2', ttmEps: Number((estimatedEps * 0.92).toFixed(2)), cmp: Number((quote.price * 0.94).toFixed(2)), emp: Number((estimatedEps * 0.92 * 25).toFixed(2)), empHigh: Number((estimatedEps * 0.92 * 31.86).toFixed(2)), empLow: Number((estimatedEps * 0.92 * 18.14).toFixed(2)) },
        { quarter: 'Q3', ttmEps: Number((estimatedEps * 0.96).toFixed(2)), cmp: Number((quote.price * 0.97).toFixed(2)), emp: Number((estimatedEps * 0.96 * 25).toFixed(2)), empHigh: Number((estimatedEps * 0.96 * 31.86).toFixed(2)), empLow: Number((estimatedEps * 0.96 * 18.14).toFixed(2)) },
        { quarter: 'Q4 (Current)', ttmEps: estimatedEps, cmp: quote.price, emp: Number((estimatedEps * 25).toFixed(2)), empHigh: Number((estimatedEps * 31.86).toFixed(2)), empLow: Number((estimatedEps * 18.14).toFixed(2)) },
      ],
    };

    STOCK_DATABASE[cleanTicker] = dynamicStock;
    return res.json({ success: true, stock: dynamicStock, quote, isDynamic: true });
  }

  res.status(404).json({ success: false, error: `Could not fetch live data for ${cleanTicker}.` });
});

// Vite dev middleware or static file serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quantitative Valuation Corridor server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
