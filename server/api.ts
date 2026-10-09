import express from 'express';
import type { StockData } from '../src/types/stock.ts';
import { DEFAULT_STOCKS } from '../src/data/defaultStocks.ts';
import { calculateEmpBands } from '../src/utils/empCalculator.ts';
import { createQuoteService, normalizeSymbol } from './quotes.ts';

export const demoStocks: StockData[] = DEFAULT_STOCKS.map((s) => ({ ...s, sourceKind: 'demo' }));
export function createApiApp({
  quotes = createQuoteService(),
  fetcher = fetch,
  batchDeadlineMs = 20_000,
}: {
  quotes?: ReturnType<typeof createQuoteService>;
  fetcher?: typeof fetch;
  batchDeadlineMs?: number;
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (_req, res) =>
    res.json({
      success: true,
      service: 'Indian Stock',
      fundamentalFeed: 'manual-and-demo',
      quoteProvider: 'Yahoo Finance',
    }),
  );
  app.get('/api/stocks', (_req, res) =>
    res.json({
      success: true,
      stocks: demoStocks.map((stock) => ({
        ...stock,
        valuation: calculateEmpBands(stock.cmp, stock.ttmEps, stock.peMean3Y, stock.peStdDev),
      })),
      count: demoStocks.length,
      sourceKind: 'demo',
    }),
  );
  app.get('/api/live-quotes', async (req, res) => {
    if (typeof req.query.tickers !== 'string' || !req.query.tickers.trim())
      return res.status(400).json({ success: false, error: 'Provide comma-separated tickers.' });
    const raw = req.query.tickers.split(',');
    if (raw.length > 40)
      return res
        .status(400)
        .json({ success: false, error: 'A maximum of 40 symbols can be refreshed at once.' });
    let symbols: string[];
    try {
      symbols = [...new Set(raw.map(normalizeSymbol))];
    } catch (e) {
      return res.status(400).json({ success: false, error: (e as Error).message });
    }
    const results: Record<string, Awaited<ReturnType<typeof quotes.get>>> = {};
    let cursor = 0;
    let expired = false;
    let expire!: () => void;
    const deadline = new Promise<void>((resolve) => {
      expire = () => {
        expired = true;
        resolve();
      };
    });
    const timer = setTimeout(expire, batchDeadlineMs);
    const onClose = () => {
      if (!res.writableEnded) expire();
    };
    res.on('close', onClose);
    const timedOut = (symbol: string): Awaited<ReturnType<typeof quotes.get>> => ({
      symbol,
      source: 'Yahoo Finance',
      status: 'unavailable',
      cmp: null,
      previousClose: null,
      change: null,
      changePercent: null,
      asOf: null,
      fetchedAt: null,
      fromCache: false,
      error: 'The quote batch deadline was reached. Refresh this symbol again.',
    });
    try {
      await Promise.all(
        Array.from({ length: Math.min(4, symbols.length) }, async () => {
          while (cursor < symbols.length) {
            const symbol = symbols[cursor++];
            results[symbol] = expired
              ? timedOut(symbol)
              : await Promise.race([quotes.get(symbol), deadline.then(() => timedOut(symbol))]);
          }
        }),
      );
    } finally {
      clearTimeout(timer);
      res.off('close', onClose);
    }
    if (res.destroyed) return;
    const availableCount = Object.values(results).filter((q) => q.status === 'available').length;
    return res.json({
      success: true,
      availableCount,
      count: symbols.length,
      quotes: results,
      fetchedAt: new Date().toISOString(),
    });
  });
  app.get('/api/search-tickers', async (req, res) => {
    if (typeof req.query.q !== 'string' || req.query.q.length > 80)
      return res
        .status(400)
        .json({ success: false, error: 'Search query must be at most 80 characters.' });
    const q = req.query.q.trim();
    if (!q) return res.json({ success: true, results: [] });
    const local = demoStocks
      .filter((s) => `${s.ticker} ${s.name}`.toLowerCase().includes(q.toLowerCase()))
      .map((s) => ({
        symbol: `${s.ticker}.NS`,
        ticker: s.ticker,
        name: s.name,
        exchange: 'NSE',
        fundamentalStatus: 'demo',
      }));
    try {
      const response = await fetcher(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) throw new Error('Search provider unavailable.');
      const data = await response.json();
      const remote = (Array.isArray(data.quotes) ? data.quotes : [])
        .filter(
          (v: { symbol?: string }) => typeof v.symbol === 'string' && /\.(NS|BO)$/.test(v.symbol),
        )
        .map((v: { symbol: string; longname?: string; shortname?: string }) => ({
          symbol: normalizeSymbol(v.symbol),
          ticker: v.symbol.replace(/\.(NS|BO)$/, ''),
          name: v.longname || v.shortname || v.symbol,
          exchange: v.symbol.endsWith('.NS') ? 'NSE' : 'BSE',
          fundamentalStatus: 'unavailable',
        }));
      const merged = new Map([...local, ...remote].map((v) => [v.symbol, v]));
      local.forEach((v) => merged.set(v.symbol, v));
      return res.json({ success: true, results: [...merged.values()].slice(0, 8) });
    } catch {
      return res.json({
        success: true,
        results: local.slice(0, 8),
        warning: 'Provider search is unavailable; showing local examples.',
      });
    }
  });
  app.get('/api/stocks/:ticker', async (req, res) => {
    let symbol: string;
    try {
      symbol = normalizeSymbol(req.params.ticker);
    } catch (e) {
      return res.status(400).json({ success: false, error: (e as Error).message });
    }
    const stock = symbol.endsWith('.NS')
      ? (demoStocks.find((s) => `${s.ticker}.NS` === symbol) ?? null)
      : null;
    const quote = await quotes.get(symbol);
    return res.json({
      success: true,
      stock,
      quote,
      fundamentalStatus: stock ? 'demo' : 'unavailable',
      message: stock
        ? 'Bundled fundamentals are unverified examples.'
        : 'No fundamentals available. Enter sourced EPS and historical P/E observations to calculate a value.',
    });
  });
  app.use('/api', (_req, res) =>
    res.status(404).json({ success: false, error: 'API endpoint not found.' }),
  );
  return app;
}
