import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StockDataView } from '../src/components/StockDataView.tsx';
import { DEFAULT_STOCKS } from '../src/data/defaultStocks.ts';
import { stockValuation } from '../src/utils/videoEmpCalculator.ts';
const s = { ...DEFAULT_STOCKS[0], sourceKind: 'repository' as const };
test('full data view exposes financial ratios and original stored bands', () => {
  const html = renderToStaticMarkup(
    createElement(StockDataView, { stocks: [s], selectedStock: s, onSelectStock: () => {} }),
  );
  assert.match(html, /58\.2%/);
  assert.match(html, /48%/);
  assert.match(html, /30\.5/);
  assert.match(html, /0\.05/);
  assert.match(html, /3,392\.00/);
  assert.match(html, /4,266\.00/);
  assert.match(html, /Repository snapshot/);
});
test('original snapshot remains visible even when saved inputs have been edited', () => {
  const edited = { ...s, cmp: 100, ttmEps: 15, roce: null, sourceKind: 'manual' as const };
  const html = renderToStaticMarkup(
    createElement(StockDataView, {
      stocks: [edited],
      selectedStock: edited,
      onSelectStock: () => {},
    }),
  );
  assert.match(html, /3,950\.00/);
  assert.match(html, /58\.2%/);
});
test('video valuation does not silently substitute PE when inputs are missing', () => {
  assert.equal(stockValuation(s, 'video', 1.96, {}).result, null);
  assert.equal(stockValuation(s, 'pe', 1.96, {}).result?.emp, 3829.3);
});
test('shared stock valuation uses video earnings and rupee-volatility parameters', () => {
  const edited = { ...s, cmp: 200, ttmEps: 15 };
  const r = stockValuation(edited, 'video', 1.96, {
    TCS: {
      referencePrice: 200,
      referenceEps: 10,
      baseline: 120,
      priceStdDev: 10,
      bandMultiplier: 3,
    },
  }).result;
  assert.equal(r?.emp, 240);
  assert.equal(r?.empLow, 210);
  assert.equal(r?.empHigh, 270);
});
