import { useState } from 'react';
import type { StockData } from '../types/stock';
import { DEFAULT_STOCKS } from '../data/defaultStocks';
import { canonicalTicker } from '../utils/symbols';
import { PageTitle, SourceNote, money, num } from './shared';
export function StockDataView({
  stocks,
  selectedStock,
  onSelectStock,
}: {
  stocks: StockData[];
  selectedStock: StockData;
  onSelectStock: (s: StockData) => void;
}) {
  const [view, setView] = useState<'repository' | 'saved'>('repository');
  const original = DEFAULT_STOCKS.find(
    (s) => canonicalTicker(s.ticker) === canonicalTicker(selectedStock.ticker),
  );
  const stock =
    view === 'repository' && original
      ? { ...original, sourceKind: 'repository' as const }
      : selectedStock;
  const metrics: [string, string][] = [
    ['Market price', money(stock.cmp)],
    ['TTM EPS', money(stock.ttmEps)],
    ['Mean P/E · 3 years', num(stock.peMean3Y)],
    ['Mean P/E · 5 years', num(stock.peMean5Y)],
    ['P/E standard deviation', num(stock.peStdDev)],
    ['Minimum P/E', num(stock.peMin)],
    ['Maximum P/E', num(stock.peMax)],
    ['ROCE', stock.roce == null ? 'Not supplied' : `${num(stock.roce)}%`],
    ['ROE', stock.roe == null ? 'Not supplied' : `${num(stock.roe)}%`],
    [
      'Sales growth · 3 years',
      stock.salesGrowth3Y == null ? 'Not supplied' : `${num(stock.salesGrowth3Y)}%`,
    ],
    [
      'Profit growth · 3 years',
      stock.profitGrowth3Y == null ? 'Not supplied' : `${num(stock.profitGrowth3Y)}%`,
    ],
    ['Debt / equity', num(stock.debtToEquity)],
  ];
  return (
    <>
      <PageTitle title="Full stock data">
        All 32 original stock records and 288 quarterly rows remain available, including their
        original stored bands.
      </PageTitle>
      <div className="model-topbar">
        <label className="stock-picker">
          Stock
          <select
            value={selectedStock.ticker}
            onChange={(e) => {
              const found = stocks.find((s) => s.ticker === e.target.value);
              if (found) onSelectStock(found);
            }}
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="stock-picker">
          View
          <select value={view} onChange={(e) => setView(e.target.value as 'repository' | 'saved')}>
            <option value="repository">Original repository snapshot</option>
            <option value="saved">Current saved inputs</option>
          </select>
        </label>
      </div>
      {view === 'repository' && !original && (
        <p className="muted">
          This custom stock has no original repository record. Showing its saved inputs.
        </p>
      )}
      <SourceNote stock={stock} />
      <section className="info-panel">
        <h2>{stock.name}</h2>
        <p>
          {stock.ticker} · {stock.sector}
        </p>
        <dl className="financial-grid">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="table-panel">
        <div className="panel-title">
          <h2>Original stored quarterly observations</h2>
          <span className="muted">{stock.historicalQuarters.length} records</span>
        </div>
        <p className="data-caption">
          Stored EMP, low and high values are shown exactly as supplied in the repository. Their
          derivation and source dates were not documented; they are not replaced by recalculated P/E
          bands.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Quarter</th>
                <th>Recorded price</th>
                <th>TTM EPS</th>
                <th>Stored EMP</th>
                <th>Stored EMP Low</th>
                <th>Stored EMP High</th>
              </tr>
            </thead>
            <tbody>
              {stock.historicalQuarters.map((h) => (
                <tr key={h.quarter}>
                  <th scope="row">{h.quarter}</th>
                  <td>{money(h.cmp)}</td>
                  <td>{money(h.ttmEps)}</td>
                  <td>{money(h.emp)}</td>
                  <td>{money(h.empLow)}</td>
                  <td>{money(h.empHigh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!stock.historicalQuarters.length && (
          <div className="empty-panel">
            <p>No historical rows were supplied for this custom model.</p>
          </div>
        )}
      </section>
      <section className="info-panel">
        <h3>Data provenance</h3>
        <p>
          “Repository snapshot” identifies your supplied dataset. It does not declare that the
          records are fabricated or that the app verified them against current filings.
        </p>
        <p>
          Changing calculation inputs does not change the original repository snapshot. Missing
          custom-model ratios are shown as unknown.
        </p>
        <a
          href="https://github.com/SVamseekar/Indian-Stock/blob/main/src/data/defaultStocks.ts"
          target="_blank"
          rel="noreferrer"
        >
          Open the original data file
        </a>
      </section>
    </>
  );
}
