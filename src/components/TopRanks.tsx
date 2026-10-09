import { useState } from 'react';
import type { StockData } from '../types/stock';
import {
  stockValuation,
  type ModelMethod,
  type VideoEmpParameters,
} from '../utils/videoEmpCalculator';
import { PageTitle, Notice, money, pct } from './shared';
export function TopRanksView({
  stocks,
  confidenceMultiplier,
  method,
  videoModels,
  onSelectStock,
  onNavigateToTab,
}: {
  stocks: StockData[];
  confidenceMultiplier: number;
  method: ModelMethod;
  videoModels: Record<string, VideoEmpParameters>;
  onSelectStock: (s: StockData) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart' | 'video_model') => void;
}) {
  const [sector, setSector] = useState('All sectors');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('upside');
  const [direction, setDirection] = useState('desc');
  const [source, setSource] = useState('all');
  const [growthOnly, setGrowthOnly] = useState(false);
  const sectors = ['All sectors', ...new Set(stocks.map((s) => s.sector))];
  const modelRows = stocks.map((stock) => {
    const referenceEps =
      method === 'video'
        ? videoModels[stock.ticker]?.referenceEps
        : stock.historicalQuarters.at(-2)?.ttmEps;
    const growth =
      referenceEps && referenceEps > 0 ? (stock.ttmEps / referenceEps - 1) * 100 : null;
    return { stock, growth, ...stockValuation(stock, method, confidenceMultiplier, videoModels) };
  });
  const missing = modelRows.filter((r) => !r.result).length;
  const rows = modelRows
    .filter(
      ({ stock, result, growth }) =>
        (sector === 'All sectors' || stock.sector === sector) &&
        (source === 'all' || stock.sourceKind === source) &&
        (!growthOnly || (growth !== null && growth > 0)) &&
        (filter === 'all' ||
          (!!result && (filter === 'below' ? stock.cmp < result.emp : stock.cmp < result.empLow))),
    )
    .sort((a, b) => {
      if (sort !== 'price') {
        if (!a.result && !b.result) return 0;
        if (!a.result) return 1;
        if (!b.result) return -1;
      }
      const val = (r: typeof a) =>
        sort === 'price'
          ? r.stock.cmp
          : sort === 'upside'
            ? r.result!.targetUpsideToEmp
            : r.result!.discountToEmp;
      return (val(a) - val(b)) * (direction === 'asc' ? 1 : -1);
    });
  return (
    <>
      <PageTitle title="Compare stocks & growth">
        Rank the scope to reach model value, with an optional improving-earnings filter.
      </PageTitle>
      <Notice>
        Using{' '}
        {method === 'video'
          ? 'the video two-component model with each stock’s supplied baseline and price volatility'
          : 'the historical P/E comparison model'}
        . These are independent workspace rankings, not Vivekam’s licensed Top Ranks.
      </Notice>
      {missing > 0 && (
        <Notice>
          {missing} stocks have incomplete{' '}
          {method === 'video' ? 'baseline or price-volatility' : 'P/E'} inputs. Their financial
          records remain visible; they are not assigned an invented valuation.
        </Notice>
      )}
      <div className="filter-bar">
        <label>
          Sector
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Price position
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All positions</option>
            <option value="below">Below model value</option>
            <option value="low">Below lower band</option>
          </select>
        </label>
        <label>
          Input source
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All records</option>
            <option value="manual">User inputs</option>
            <option value="repository">Repository snapshot</option>
          </select>
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="upside">Move to model value</option>
            <option value="discount">Price vs. model</option>
            <option value="price">Market price</option>
          </select>
        </label>
        <label>
          Order
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="asc">Low to high</option>
            <option value="desc">High to low</option>
          </select>
        </label>
      </div>
      <label className="check-label growth-filter">
        <input
          type="checkbox"
          checked={growthOnly}
          onChange={(e) => setGrowthOnly(e.target.checked)}
        />
        Only stocks with higher TTM EPS than their reference period
      </label>
      <section className="table-panel">
        <div className="panel-title">
          <h2>{rows.length} matching stocks</h2>
          <span className="muted">
            {method === 'video' ? 'Video-method inputs' : 'P/E comparison inputs'}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Inputs</th>
                <th>Market price</th>
                <th>TTM EPS change</th>
                <th>Model value</th>
                <th>Lower band</th>
                <th>Upper band</th>
                <th>Move to model</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ stock: s, result: r, growth, error }) => (
                <tr key={s.ticker}>
                  <th scope="row">
                    <span>{s.ticker}</span>
                    <small>{s.name}</small>
                  </th>
                  <td>
                    <span className={`badge ${s.sourceKind === 'manual' ? 'blue' : 'amber'}`}>
                      {s.sourceKind === 'manual' ? 'User' : 'Repository'}
                    </span>
                  </td>
                  <td>{money(s.cmp)}</td>
                  <td>{pct(growth)}</td>
                  <td title={error}>{r ? money(r.emp) : 'Inputs required'}</td>
                  <td>{money(r?.empLow)}</td>
                  <td>{money(r?.empHigh)}</td>
                  <td>{pct(r?.targetUpsideToEmp ?? null)}</td>
                  <td>
                    <button
                      className="text-button"
                      aria-label={`Open ${s.ticker} model`}
                      onClick={() => {
                        onSelectStock(s);
                        onNavigateToTab(method === 'video' ? 'video_model' : 'calculator');
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-panel">
            <h3>No matching records</h3>
            <p>Change the filters or supply the missing model parameters.</p>
            <button
              className="button subtle"
              onClick={() => {
                setSector('All sectors');
                setFilter('all');
                setSource('all');
                setGrowthOnly(false);
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <p className="muted data-caption">
        TTM EPS change compares the saved earnings with the supplied reference EPS, or the preceding
        stored quarterly observation for P/E comparisons. It is not an automatically verified growth
        forecast.
      </p>
    </>
  );
}
