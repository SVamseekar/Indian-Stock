import type { MarketQuote } from '../src/types/stock.ts';

import { normalizeSymbol } from '../src/utils/symbols.ts';
export { normalizeSymbol } from '../src/utils/symbols.ts';
const message = (e: unknown) => (e instanceof Error ? e.message : 'Market data provider failed.');
export function createQuoteService({
  fetcher = fetch,
  now = Date.now,
  timeoutMs = 5000,
}: { fetcher?: typeof fetch; now?: () => number; timeoutMs?: number } = {}) {
  const cache = new Map<string, MarketQuote>();
  const inFlight = new Map<string, Promise<MarketQuote>>();
  const unavailable = (symbol: string, error: string): MarketQuote => ({
    symbol,
    status: 'unavailable',
    source: 'Yahoo Finance',
    cmp: null,
    previousClose: null,
    change: null,
    changePercent: null,
    asOf: null,
    fetchedAt: null,
    fromCache: false,
    error,
  });
  async function refresh(symbol: string): Promise<MarketQuote> {
    let error = 'Market data provider failed.';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetcher(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
          {
            headers: { 'User-Agent': 'IndianStockResearch/1.0', Accept: 'application/json' },
            signal: AbortSignal.timeout(timeoutMs),
          },
        );
        if (!response.ok) {
          error = `Quote provider returned HTTP ${response.status}.`;
          if (response.status >= 500 && attempt === 0) continue;
          break;
        }
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (
          data?.chart?.error ||
          !meta ||
          meta.symbol !== symbol ||
          meta.currency !== 'INR' ||
          !Number.isFinite(meta.regularMarketPrice) ||
          meta.regularMarketPrice <= 0 ||
          !Number.isFinite(meta.regularMarketTime) ||
          meta.regularMarketTime <= 0 ||
          meta.regularMarketTime * 1000 > now() + 300_000
        ) {
          throw new Error('Provider returned incomplete or mismatched quote data.');
        }
        const previous = meta.previousClose ?? meta.chartPreviousClose;
        const previousClose = Number.isFinite(previous) && previous > 0 ? previous : null;
        const cmp = meta.regularMarketPrice;
        const change = previousClose === null ? null : cmp - previousClose;
        const quote: MarketQuote = {
          symbol,
          source: 'Yahoo Finance',
          status: now() - meta.regularMarketTime * 1000 > 86_400_000 ? 'stale' : 'available',
          cmp,
          previousClose,
          change,
          changePercent: change === null ? null : (change / previousClose!) * 100,
          asOf: new Date(meta.regularMarketTime * 1000).toISOString(),
          fetchedAt: new Date(now()).toISOString(),
          fromCache: false,
        };
        if (cache.size >= 500) cache.delete(cache.keys().next().value!);
        cache.set(symbol, quote);
        return quote;
      } catch (e) {
        error = message(e);
      }
    }
    const old = cache.get(symbol);
    if (old && now() - Date.parse(old.fetchedAt!) < 86_400_000)
      return { ...old, status: 'stale', fromCache: true, error };
    return unavailable(symbol, error);
  }
  return {
    async get(rawSymbol: string): Promise<MarketQuote> {
      const symbol = normalizeSymbol(rawSymbol);
      const old = cache.get(symbol);
      if (old && now() - Date.parse(old.fetchedAt!) < 30_000) return { ...old, fromCache: true };
      const pending = inFlight.get(symbol);
      if (pending) return pending;
      const request = refresh(symbol).finally(() => inFlight.delete(symbol));
      inFlight.set(symbol, request);
      return request;
    },
  };
}
