import test from 'node:test';
import assert from 'node:assert/strict';
import { createManualStock, summarizePortfolio, parsePeSeries } from '../src/utils/workspace.ts';
import { DEFAULT_STOCKS } from '../src/data/defaultStocks.ts';
test('incomplete imports are rejected rather than filled with invented fundamentals', () => {
  assert.throws(() => createManualStock({ cmp: 100, ttmEps: 10 }));
});
test('manual records contain no fabricated history and retain zero standard deviation', () => {
  const s = createManualStock({
    ticker: 'TCS.NS',
    name: 'Test',
    cmp: 100,
    ttmEps: 10,
    peMean3Y: 20,
    peStdDev: 0,
    sourceUrl: 'https://www.screener.in/company/TCS/',
    asOf: '2026-09-30',
  });
  assert.equal(s.peStdDev, 0);
  assert.equal(s.sourceKind, 'manual');
  assert.deepEqual(s.historicalQuarters, []);
  assert.equal(s.asOf, '2026-09-30');
});
test('P/E series rejects partial numbers and losses, preserving constant observations', () => {
  assert.deepEqual(parsePeSeries('20, 20, 20'), [20, 20, 20]);
  for (const s of ['20oops, 30', '20, -1', '20, NaN', '', '20'])
    assert.throws(() => parsePeSeries(s));
});
test('portfolio uses current workspace prices, validates holdings, and keeps missing symbols out of totals', () => {
  const stocks = [{ ...DEFAULT_STOCKS[0], cmp: 120 }];
  const r = summarizePortfolio(
    [
      { id: '1', ticker: 'TCS', quantity: 10, avgBuyPrice: 100 },
      { id: '2', ticker: 'MISSING', quantity: 10, avgBuyPrice: 100 },
    ],
    stocks,
  );
  assert.equal(r.currentValue, 1200);
  assert.equal(r.invested, 1000);
  assert.equal(r.pnl, 200);
  assert.equal(r.missing.length, 1);
  assert.throws(() =>
    summarizePortfolio([{ id: '1', ticker: 'TCS', quantity: -1, avgBuyPrice: 100 }], stocks),
  );
});
test('financial dates and source schemes are validated before saving', () => {
  const input = { cmp: 100, ttmEps: 5, peMean3Y: 20, peStdDev: 3 };
  assert.throws(() => createManualStock({ ...input, asOf: '2026-02-31' }));
  assert.throws(() => createManualStock({ ...input, sourceUrl: 'javascript:alert(1)' }));
});
test('NSE aliases update one model identity while keeping BSE distinct', () => {
  const s = createManualStock({ ticker: 'TCS.NS', cmp: 100, ttmEps: 5, peMean3Y: 20, peStdDev: 3 });
  assert.equal(s.ticker, 'TCS');
  const p = summarizePortfolio(
    [{ id: '1', ticker: 'TCS.NS', quantity: 10, avgBuyPrice: 80 }],
    [{ ...s, ticker: 'TCS' }],
  );
  assert.equal(p.currentValue, 1000);
  assert.equal(createManualStock({ ...s, ticker: 'TCS.BO' }).ticker, 'TCS.BO');
});
