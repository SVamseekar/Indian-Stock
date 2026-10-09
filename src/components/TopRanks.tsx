import { useState } from 'react';
import type { StockData } from '../types/stock';
import { tryCalculateEmpBands } from '../utils/empCalculator';
import { PageTitle, Notice, money, pct } from './shared';
export function TopRanksView({
  stocks,
  confidenceMultiplier,
  onSelectStock,
  onNavigateToTab,
}: {
  stocks: StockData[];
  confidenceMultiplier: number;
  onSelectStock: (s: StockData) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart') => void;
}) {
  const [sector, setSector] = useState('All sectors');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('discount');
  const [direction, setDirection] = useState('asc');
  const [source, setSource] = useState('all');
  const sectors = ['All sectors', ...new Set(stocks.map((s) => s.sector))];
  const rows = stocks
    .map((stock) => ({
      stock,
      ...tryCalculateEmpBands(
        stock.cmp,
        stock.ttmEps,
        stock.peMean3Y,
        stock.peStdDev,
        confidenceMultiplier,
      ),
    }))
    .filter(
      ({ stock, result }) =>
        result &&
        (sector === 'All sectors' || stock.sector === sector) &&
        (source === 'all' || stock.sourceKind === source) &&
        (filter === 'all' ||
          (filter === 'below' ? stock.cmp < result.emp : stock.cmp < result.empLow)),
    )
    .sort((a, b) => {
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
      <PageTitle title="Compare stock valuations">
        Compare saved models on the same band width. Rankings reflect your assumptions.
      </PageTitle>
      <Notice>
        Bundled examples are unverified. Quote refresh does not change a model’s price until you
        choose “Use quote” and save it in the calculator.
      </Notice>
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
          Inputs
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All inputs</option>
            <option value="manual">User inputs</option>
            <option value="demo">Examples</option>
          </select>
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="discount">Price vs. model</option>
            <option value="upside">Move to model</option>
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
      <section className="table-panel">
        <div className="panel-title">
          <h2>{rows.length} matching models</h2>
          <span className="muted">Band width: ±{confidenceMultiplier}σ</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Inputs</th>
                <th>Market price</th>
                <th>Model value</th>
                <th>Lower band</th>
                <th>Upper band</th>
                <th>Price vs. model</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ stock: s, result: r }) => (
                <tr key={s.ticker}>
                  <th scope="row">
                    <span>{s.ticker}</span>
                    <small>{s.name}</small>
                  </th>
                  <td>
                    <span className={`badge ${s.sourceKind === 'manual' ? 'blue' : 'amber'}`}>
                      {s.sourceKind === 'manual' ? 'User' : 'Example'}
                    </span>
                  </td>
                  <td>{money(s.cmp)}</td>
                  <td>{money(r!.emp)}</td>
                  <td>{money(r!.empLow)}</td>
                  <td>{money(r!.empHigh)}</td>
                  <td className={r!.discountToEmp < 0 ? 'positive' : ''}>
                    {pct(r!.discountToEmp)}
                  </td>
                  <td>
                    <button
                      className="text-button"
                      aria-label={`Open ${s.ticker} model`}
                      onClick={() => {
                        onSelectStock(s);
                        onNavigateToTab('calculator');
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
            <h3>No matching models</h3>
            <p>Change the filters or import financial inputs for a company.</p>
            <button
              className="button subtle"
              onClick={() => {
                setSector('All sectors');
                setFilter('all');
                setSource('all');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
