import type { StockData, PortfolioHolding } from '../types/stock';
import { canonicalTicker } from './symbols';
import { calculateEmpBands } from './empCalculator';

export function createManualStock(data: Partial<StockData>): StockData {
  const { cmp, ttmEps, peMean3Y, peStdDev } = data;
  if ([cmp, ttmEps, peMean3Y, peStdDev].some((v) => typeof v !== 'number'))
    throw new Error('Provide market price, TTM EPS, mean P/E and P/E standard deviation.');
  calculateEmpBands(cmp!, ttmEps!, peMean3Y!, peStdDev!);
  if (data.sourceUrl && !/^https?:\/\//i.test(data.sourceUrl))
    throw new Error('Source link must begin with https:// or http://.');
  if (
    data.asOf &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(data.asOf) ||
      !Number.isFinite(Date.parse(data.asOf)) ||
      new Date(data.asOf).toISOString().slice(0, 10) !== data.asOf)
  )
    throw new Error('Enter a valid financial period date.');
  const ticker = data.ticker ? canonicalTicker(data.ticker) : `CUSTOM-${Date.now()}`;
  if (!/^[A-Z0-9][A-Z0-9&.-]{0,39}$/.test(ticker))
    throw new Error('Enter a valid ticker or model name.');
  return {
    ticker,
    name: data.name?.trim() || 'Custom valuation',
    sector: data.sector || 'Custom',
    cmp: cmp!,
    ttmEps: ttmEps!,
    peMean3Y: peMean3Y!,
    peMean5Y: peMean3Y!,
    peStdDev: peStdDev!,
    peMin: 0,
    peMax: 0,
    roce: 0,
    roe: 0,
    salesGrowth3Y: 0,
    profitGrowth3Y: 0,
    debtToEquity: 0,
    historicalQuarters: [],
    sourceKind: 'manual',
    sourceUrl: data.sourceUrl,
    asOf: data.asOf,
  };
}
export function parsePeSeries(text: string): number[] {
  const tokens = text.trim().split(/[,;\s]+/);
  if (!text.trim() || tokens.length < 2)
    throw new Error('Enter at least two positive P/E observations.');
  const values = tokens.map(Number);
  if (!values.every((v) => Number.isFinite(v) && v > 0))
    throw new Error(
      'Every P/E observation must be a positive number. Remove text, losses and missing values.',
    );
  return values;
}
export function summarizePortfolio(holdings: PortfolioHolding[], stocks: StockData[]) {
  const missing: PortfolioHolding[] = [];
  const rows = holdings.flatMap((h) => {
    if (
      !Number.isInteger(h.quantity) ||
      h.quantity <= 0 ||
      !Number.isFinite(h.avgBuyPrice) ||
      h.avgBuyPrice <= 0
    )
      throw new Error(
        'Quantity must be a positive whole number and average cost must be positive.',
      );
    const stock = stocks.find((s) => canonicalTicker(s.ticker) === canonicalTicker(h.ticker));
    if (!stock) {
      missing.push(h);
      return [];
    }
    const invested = h.quantity * h.avgBuyPrice;
    const currentValue = h.quantity * stock.cmp;
    if (![invested, currentValue].every(Number.isFinite))
      throw new Error('Holding value is too large.');
    return [{ ...h, stock, invested, currentValue, pnl: currentValue - invested }];
  });
  const invested = rows.reduce((sum, h) => sum + h.invested, 0);
  const currentValue = rows.reduce((sum, h) => sum + h.currentValue, 0);
  return { rows, missing, invested, currentValue, pnl: currentValue - invested };
}
export function readManualStocks(): StockData[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('indian-stock-models-v1') || '[]');
    if (!Array.isArray(data)) return [];
    const records = data.flatMap((v) => {
      try {
        return [createManualStock(v)];
      } catch {
        return [];
      }
    });
    const unique = new Map<string, StockData>();
    records.forEach((stock) => {
      if (!unique.has(stock.ticker)) unique.set(stock.ticker, stock);
    });
    return [...unique.values()];
  } catch {
    return [];
  }
}

export function readPortfolioHoldings(): PortfolioHolding[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('indian-stock-portfolio-v1') || '[]');
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (h) =>
          typeof h?.id === 'string' &&
          typeof h.ticker === 'string' &&
          Number.isInteger(h.quantity) &&
          h.quantity > 0 &&
          Number.isFinite(h.avgBuyPrice) &&
          h.avgBuyPrice > 0,
      )
      .map((h) => ({ ...h, ticker: canonicalTicker(h.ticker) }));
  } catch {
    return [];
  }
}
