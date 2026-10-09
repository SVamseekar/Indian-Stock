import test from 'node:test';
import assert from 'node:assert/strict';
import { readManualStocks, readPortfolioHoldings } from '../src/utils/workspace.ts';
import { quoteBatches } from '../src/utils/symbols.ts';
import { DEFAULT_STOCKS } from '../src/data/defaultStocks.ts';
function withStorage(value: unknown, run: () => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify(value) },
  });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}
test('valid persisted models above the former count limit are retained', () => {
  const records = Array.from({ length: 101 }, (_, i) => ({
    ticker: `MODEL${i}`,
    cmp: 100,
    ttmEps: 5,
    peMean3Y: 20,
    peStdDev: 3,
  }));
  withStorage(records, () => assert.equal(readManualStocks().length, 101));
});
test('valid holdings above the former count limit are retained and NSE aliases canonicalized', () => {
  const records = Array.from({ length: 501 }, (_, i) => ({
    id: String(i),
    ticker: 'TCS.NS',
    quantity: 1,
    avgBuyPrice: 80,
  }));
  withStorage(records, () => {
    const h = readPortfolioHoldings();
    assert.equal(h.length, 501);
    assert.equal(h[0].ticker, 'TCS');
  });
});
test('quote batches exclude custom or invalid symbols, deduplicate aliases and include all records', () => {
  const stocks = Array.from({ length: 45 }, (_, i) => ({
    ...DEFAULT_STOCKS[0],
    ticker: `TEST${i}`,
  }));
  const batches = quoteBatches([
    ...stocks,
    { ...stocks[0], ticker: 'TEST0.NS' },
    { ...stocks[0], ticker: 'MODEL.V1' },
    { ...stocks[0], ticker: 'TCS.US' },
    { ...stocks[0], ticker: 'CUSTOM-123' },
  ]);
  assert.deepEqual(
    batches.map((b) => b.length),
    [40, 5],
  );
  assert.equal(batches[1][4], 'TEST44.NS');
});
