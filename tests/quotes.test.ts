import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuoteService, normalizeSymbol } from '../server/quotes.ts';

const clock = Date.parse('2026-10-09T10:00:00Z');
const payload = (symbol = 'TCS.NS', price = 100, currency = 'INR') => ({
  chart: {
    result: [
      {
        meta: {
          symbol,
          currency,
          regularMarketPrice: price,
          regularMarketTime: clock / 1000 - 60,
          chartPreviousClose: 80,
        },
      },
    ],
    error: null,
  },
});
const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
test('normalizes exchange-specific symbols without merging NSE and BSE', () => {
  assert.equal(normalizeSymbol(' tcs.ns '), 'TCS.NS');
  assert.equal(normalizeSymbol('500112.bo'), '500112.BO');
  assert.equal(normalizeSymbol('M&M'), 'M&M.NS');
  assert.throws(() => normalizeSymbol('../../bad'));
  assert.throws(() => normalizeSymbol('AAPL.US'));
});
test('keeps the provider timestamp and derives change from previous close', async () => {
  const service = createQuoteService({ now: () => clock, fetcher: async () => ok(payload()) });
  const q = await service.get('TCS');
  assert.equal(q.cmp, 100);
  assert.equal(q.change, 20);
  assert.equal(q.changePercent, 25);
  assert.equal(q.asOf, '2026-10-09T09:59:00.000Z');
  assert.equal(q.status, 'available');
});
test('a provider failure returns unavailable with no sample price or fundamentals', async () => {
  const service = createQuoteService({
    now: () => clock,
    fetcher: async () => new Response('', { status: 429 }),
  });
  const q = await service.get('TCS');
  assert.equal(q.status, 'unavailable');
  assert.equal(q.cmp, null);
  assert.equal(q.asOf, null);
  assert.equal('ttmEps' in q, false);
});
test('stale fallback retains the original timestamp, not the failed refresh time', async () => {
  let time = clock;
  let fail = false;
  const service = createQuoteService({
    now: () => time,
    fetcher: async () => (fail ? new Response('', { status: 503 }) : ok(payload())),
  });
  await service.get('TCS');
  time += 61_000;
  fail = true;
  const q = await service.get('TCS');
  assert.equal(q.status, 'stale');
  assert.equal(q.asOf, '2026-10-09T09:59:00.000Z');
  assert.equal(q.fetchedAt, '2026-10-09T10:00:00.000Z');
});
test('validates price, currency, timestamps and symbol identity before caching', async () => {
  for (const data of [
    payload('TCS.NS', 0),
    payload('TCS.NS', 100, 'USD'),
    payload('INFY.NS'),
    {
      chart: { result: [{ meta: { symbol: 'TCS.NS', currency: 'INR', regularMarketPrice: 100 } }] },
    },
  ]) {
    const service = createQuoteService({ now: () => clock, fetcher: async () => ok(data) });
    assert.equal((await service.get('TCS')).status, 'unavailable');
  }
});
test('coalesces concurrent refreshes and distinguishes BSE cache keys', async () => {
  let calls = 0;
  const service = createQuoteService({
    now: () => clock,
    fetcher: async (url: string | URL | Request) => {
      calls++;
      const symbol = decodeURIComponent(String(url).split('/chart/')[1].split('?')[0]);
      return ok(payload(symbol, symbol.endsWith('.NS') ? 100 : 120));
    },
  });
  const [a, b] = await Promise.all([service.get('TCS.NS'), service.get('TCS.NS')]);
  assert.equal(a.cmp, 100);
  assert.equal(b.cmp, 100);
  assert.equal(calls, 1);
  assert.equal((await service.get('TCS.BO')).cmp, 120);
  assert.equal(calls, 2);
});
test('fresh cache keeps provider time and does not perform redundant fetches', async () => {
  let calls = 0;
  let time = clock;
  const service = createQuoteService({
    now: () => time,
    fetcher: async () => {
      calls++;
      return ok(payload());
    },
  });
  await service.get('TCS');
  time += 1000;
  const q = await service.get('TCS');
  assert.equal(calls, 1);
  assert.equal(q.fromCache, true);
  assert.equal(q.fetchedAt, '2026-10-09T10:00:00.000Z');
});
test('missing previous close is unknown rather than a manufactured zero change', async () => {
  const data = payload();
  delete (data.chart.result[0].meta as Partial<(typeof data.chart.result)[0]['meta']>)
    .chartPreviousClose;
  const service = createQuoteService({ now: () => clock, fetcher: async () => ok(data) });
  const q = await service.get('TCS');
  assert.equal(q.previousClose, null);
  assert.equal(q.change, null);
  assert.equal(q.changePercent, null);
});
test('old market timestamps are marked stale even when the download just succeeded', async () => {
  const data = payload();
  data.chart.result[0].meta.regularMarketTime -= 2 * 86400;
  const service = createQuoteService({ now: () => clock, fetcher: async () => ok(data) });
  assert.equal((await service.get('TCS')).status, 'stale');
});
