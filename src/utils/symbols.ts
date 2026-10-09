import type { StockData } from '../types/stock';

export function normalizeSymbol(raw: string): string {
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9&-]{0,29}(?:\.(?:NS|BO))?$/.test(symbol)) {
    throw new Error('Enter a valid NSE or BSE symbol (for example TCS.NS or 500112.BO).');
  }
  return /\.(NS|BO)$/.test(symbol) ? symbol : `${symbol}.NS`;
}
export function canonicalTicker(raw: string): string {
  try {
    return normalizeSymbol(raw).replace(/\.NS$/, '');
  } catch {
    return raw.trim().toUpperCase();
  }
}
export function quoteSymbolFor(stock: StockData): string | null {
  if (stock.ticker.startsWith('CUSTOM-')) return null;
  try {
    return normalizeSymbol(stock.ticker);
  } catch {
    return null;
  }
}
export function quoteBatches(stocks: StockData[]): string[][] {
  const symbols = [...new Set(stocks.map(quoteSymbolFor).filter((s): s is string => !!s))];
  return Array.from({ length: Math.ceil(symbols.length / 40) }, (_, i) =>
    symbols.slice(i * 40, (i + 1) * 40),
  );
}
