import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApiApp } from '../server/api.ts';
import { createQuoteService } from '../server/quotes.ts';

const stamp = Date.parse('2026-10-09T10:00:00Z');
async function withApi(run: (base: string) => Promise<void>, fail = false) {
  const fetcher: typeof fetch = async (url) => {
    if (fail) return new Response('', { status: 429 });
    const symbol = decodeURIComponent(String(url).split('/chart/')[1]?.split('?')[0] || 'TCS.NS');
    return new Response(
      JSON.stringify({
        chart: {
          result: [
            {
              meta: {
                symbol,
                currency: 'INR',
                regularMarketPrice: 100,
                regularMarketTime: stamp / 1000,
                previousClose: 80,
              },
            },
          ],
        },
      }),
    );
  };
  const app = createApiApp({ quotes: createQuoteService({ fetcher, now: () => stamp }), fetcher });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
test('unknown stocks return quote-only records with no invented earnings or history', () =>
  withApi(async (base) => {
    const data = await (await fetch(`${base}/api/stocks/NEWSTOCK.NS`)).json();
    assert.equal(data.stock, null);
    assert.equal(data.fundamentalStatus, 'unavailable');
    assert.equal(data.quote.cmp, 100);
  }));
test('all bundled stocks remain explicitly labelled demo data on API responses', () =>
  withApi(async (base) => {
    const data = await (await fetch(`${base}/api/stocks`)).json();
    assert.ok(data.stocks.length > 0);
    assert.ok(data.stocks.every((s: { sourceKind: string }) => s.sourceKind === 'demo'));
    assert.ok(Math.abs(data.stocks[0].valuation.empLow - 2972.976) < 1e-8);
  }));
test('BSE symbols do not silently inherit NSE demo fundamentals', () =>
  withApi(async (base) => {
    const data = await (await fetch(`${base}/api/stocks/TCS.BO`)).json();
    assert.equal(data.stock, null);
    assert.equal(data.quote.symbol, 'TCS.BO');
  }));
test('batch endpoints reject malformed, missing and oversized ticker input', () =>
  withApi(async (base) => {
    for (const query of [
      '',
      '?tickers=../bad',
      `?tickers=${Array(41).fill('TCS').join(',')}`,
      '?tickers=TCS&tickers=INFY',
    ]) {
      const response = await fetch(`${base}/api/live-quotes${query}`);
      assert.equal(response.status, 400);
    }
  }));
test('failed quotes are represented individually and availability is not faked', () =>
  withApi(async (base) => {
    const data = await (await fetch(`${base}/api/live-quotes?tickers=TCS,INFY`)).json();
    assert.equal(data.availableCount, 0);
    assert.equal(data.quotes['TCS.NS'].status, 'unavailable');
    assert.equal(data.quotes['TCS.NS'].cmp, null);
  }, true));
test('unknown API paths return JSON 404 rather than the website HTML', () =>
  withApi(async (base) => {
    const response = await fetch(`${base}/api/does-not-exist`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).success, false);
  }));
test('batch deadline keeps completed quotes and stops scheduling remaining symbols', async () => {
  const requested: string[] = [];
  const fetcher: typeof fetch = async (url) => {
    const symbol = decodeURIComponent(String(url).split('/chart/')[1].split('?')[0]);
    requested.push(symbol);
    if (symbol !== 'FAST.NS') await new Promise((resolve) => setTimeout(resolve, 100));
    return new Response(
      JSON.stringify({
        chart: {
          result: [
            {
              meta: {
                symbol,
                currency: 'INR',
                regularMarketPrice: 100,
                regularMarketTime: stamp / 1000,
              },
            },
          ],
        },
      }),
    );
  };
  const app = createApiApp({
    quotes: createQuoteService({ fetcher, now: () => stamp }),
    batchDeadlineMs: 20,
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const d = await (
      await fetch(
        `http://127.0.0.1:${port}/api/live-quotes?tickers=FAST,SLOW1,SLOW2,SLOW3,SLOW4,SLOW5,SLOW6,SLOW7`,
      )
    ).json();
    assert.equal(d.availableCount, 1);
    assert.equal(d.quotes['FAST.NS'].cmp, 100);
    assert.equal(d.quotes['SLOW7.NS'].status, 'unavailable');
    assert.ok(requested.length <= 5);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
