import { useState, useEffect } from 'react';
import type { PortfolioHolding, StockData } from '../types/stock';
import { summarizePortfolio, readPortfolioHoldings } from '../utils/workspace';
import {
  stockValuation,
  type ModelMethod,
  type VideoEmpParameters,
} from '../utils/videoEmpCalculator';
import { Field, Notice, PageTitle, money, pct } from './shared';
export function PortfolioScannerView({
  stocks,
  confidenceMultiplier,
  method,
  videoModels,
  selectedTicker,
  onSelectStock,
  onNavigateToTab,
}: {
  stocks: StockData[];
  confidenceMultiplier: number;
  method: ModelMethod;
  videoModels: Record<string, VideoEmpParameters>;
  selectedTicker?: string;
  onSelectStock: (s: StockData) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart' | 'video_model') => void;
}) {
  const [holdings, setHoldings] = useState(readPortfolioHoldings);
  const [ticker, setTicker] = useState(selectedTicker || stocks[0].ticker);
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (selectedTicker) setTicker(selectedTicker);
  }, [selectedTicker]);
  useEffect(() => {
    try {
      localStorage.setItem('indian-stock-portfolio-v1', JSON.stringify(holdings));
    } catch {
      setMessage('Browser storage is unavailable; changes will last only in this session.');
    }
  }, [holdings]);
  let totals: ReturnType<typeof summarizePortfolio>;
  try {
    totals = summarizePortfolio(holdings, stocks);
  } catch {
    totals = summarizePortfolio([], stocks);
  }
  const add = () => {
    const q = quantity.trim() ? Number(quantity) : NaN,
      c = cost.trim() ? Number(cost) : NaN;
    try {
      const holding = { id: crypto.randomUUID(), ticker, quantity: q, avgBuyPrice: c };
      summarizePortfolio([holding], stocks);
      setHoldings((h) => [...h, holding]);
      setMessage('Holding added.');
      setQuantity('');
      setCost('');
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <>
      <PageTitle title="My portfolio">
        Track holdings against the prices and valuation assumptions in your saved models.
      </PageTitle>
      <Notice>
        Portfolio values use saved prices; valuation uses the model selected above. To update one,
        use a provider quote in the calculator and save. Holdings stay in this browser.
      </Notice>
      <div className="portfolio-summary">
        <div>
          <span>Invested</span>
          <strong>{money(totals.invested)}</strong>
        </div>
        <div>
          <span>Value at saved prices</span>
          <strong>{money(totals.currentValue)}</strong>
        </div>
        <div>
          <span>Unrealized gain / loss</span>
          <strong className={totals.pnl >= 0 ? 'positive' : 'negative'}>{money(totals.pnl)}</strong>
          <small>{totals.invested ? pct((totals.pnl / totals.invested) * 100) : '—'}</small>
        </div>
      </div>
      <section className="input-panel portfolio-form">
        <h2>Add a holding</h2>
        <div className="holding-fields">
          <div className="field">
            <label htmlFor="holding-stock">Stock model</label>
            <select id="holding-stock" value={ticker} onChange={(e) => setTicker(e.target.value)}>
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <Field label="Quantity (whole shares)" value={quantity} onChange={setQuantity} />
          <Field label="Average cost per share (₹)" value={cost} onChange={setCost} />
          <button className="button primary" onClick={add}>
            Add holding
          </button>
        </div>
        {message && <Notice>{message}</Notice>}
      </section>
      <section className="table-panel">
        <div className="panel-title">
          <h2>{holdings.length} holdings</h2>
          {!holdings.length && (
            <button
              className="text-button"
              onClick={() =>
                setHoldings(
                  stocks.slice(0, 3).map((s) => ({
                    id: crypto.randomUUID(),
                    ticker: s.ticker,
                    quantity: 10,
                    avgBuyPrice: s.cmp,
                  })),
                )
              }
            >
              Load example holdings
            </button>
          )}
        </div>
        {totals.missing.length > 0 && (
          <Notice>
            {totals.missing.map((h) => h.ticker).join(', ')} have no saved model and are excluded
            from totals. Re-import their models or remove the holdings below.
          </Notice>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Quantity</th>
                <th>Cost / share</th>
                <th>Saved price</th>
                <th>Position value</th>
                <th>Gain / loss</th>
                <th>{method === 'video' ? 'Video EMP / share' : 'P/E model / share'}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {totals.rows.map((h) => {
                const { result: r } = stockValuation(
                  h.stock,
                  method,
                  confidenceMultiplier,
                  videoModels,
                );
                return (
                  <tr key={h.id}>
                    <th scope="row">
                      <span>{h.ticker}</span>
                      <small>
                        {h.stock.sourceKind === 'manual' ? 'User inputs' : 'Repository snapshot'}
                      </small>
                    </th>
                    <td>{h.quantity}</td>
                    <td>{money(h.avgBuyPrice)}</td>
                    <td>{money(h.stock.cmp)}</td>
                    <td>{money(h.currentValue)}</td>
                    <td className={h.pnl >= 0 ? 'positive' : 'negative'}>{money(h.pnl)}</td>
                    <td>{r ? money(r.emp) : 'Inputs required'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          aria-label={`Review ${h.ticker}`}
                          onClick={() => {
                            onSelectStock(h.stock);
                            onNavigateToTab(method === 'video' ? 'video_model' : 'calculator');
                          }}
                        >
                          Review
                        </button>
                        <button
                          className="text-button negative"
                          aria-label={`Remove ${h.ticker} holding`}
                          onClick={() => setHoldings((prev) => prev.filter((p) => p.id !== h.id))}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {totals.missing.map((h) => (
                <tr key={h.id}>
                  <th>{h.ticker}</th>
                  <td>{h.quantity}</td>
                  <td colSpan={5}>Model missing</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setHoldings((prev) => prev.filter((p) => p.id !== h.id))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!holdings.length && (
          <div className="empty-panel">
            <h3>Your portfolio is empty</h3>
            <p>Add a holding above, or load clearly labeled example holdings to explore.</p>
          </div>
        )}
      </section>
    </>
  );
}
