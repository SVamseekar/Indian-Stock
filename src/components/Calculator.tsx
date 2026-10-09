import { useEffect, useState } from 'react';
import { ArrowDownToLine, Search, BookmarkCheck, ArrowUpRight } from 'lucide-react';
import type { StockData } from '../types/stock';
import { tryCalculateEmpBands } from '../utils/empCalculator';
import { createManualStock } from '../utils/workspace';
import { Field, Notice, PageTitle, ResultPanel, SourceNote, money, num } from './shared';
const asNumber = (v: string) => (v.trim() ? Number(v) : NaN);
interface Props {
  onRemoveModel: (ticker: string) => void;
  stocks: StockData[];
  selectedStock: StockData;
  onSelectStock: (s: StockData) => void;
  onAddToPortfolio: (s: StockData) => void;
  confidenceMultiplier: number;
  setConfidenceMultiplier: (v: number) => void;
}
export function CalculatorView({
  stocks,
  selectedStock: stock,
  onSelectStock,
  onAddToPortfolio,
  confidenceMultiplier: k,
  setConfidenceMultiplier,
  onRemoveModel,
}: Props) {
  const getDraft = () => ({
    cmp: String(stock.cmp),
    eps: String(stock.ttmEps),
    mean: String(stock.peMean3Y),
    sd: String(stock.peStdDev),
    source: stock.sourceUrl || '',
    asOf: stock.asOf || '',
  });
  const [draft, setDraft] = useState(getDraft);
  const [search, setSearch] = useState('');
  const [remote, setRemote] = useState<{ symbol: string; name: string }[]>([]);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    setDraft(getDraft());
    setMessage('');
  }, [stock.ticker, stock.cmp, stock.ttmEps, stock.peMean3Y, stock.peStdDev]);
  useEffect(() => {
    setRemote([]);
    setSearchError('');
    setRemoteBusy(false);
    if (search.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRemoteBusy(true);
      try {
        const res = await fetch(`/api/search-tickers?q=${encodeURIComponent(search.trim())}`, {
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error('Search is unavailable. Use a saved stock or enter your own inputs.');
        const data = await res.json();
        if (!controller.signal.aborted) {
          setRemote(
            (data.results || []).filter(
              (r: { symbol: string }) =>
                !stocks.some((s) => `${s.ticker}.NS` === r.symbol || s.ticker === r.symbol),
            ),
          );
          setSearchError(data.warning || '');
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setSearchError(e instanceof Error ? e.message : 'Search unavailable.');
      } finally {
        if (!controller.signal.aborted) setRemoteBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, stocks.length]);
  const update = (field: keyof typeof draft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setMessage('');
  };
  const { result, error } = tryCalculateEmpBands(
    asNumber(draft.cmp),
    asNumber(draft.eps),
    asNumber(draft.mean),
    asNumber(draft.sd),
    k,
  );
  const dirty =
    draft.cmp !== String(stock.cmp) ||
    draft.eps !== String(stock.ttmEps) ||
    draft.mean !== String(stock.peMean3Y) ||
    draft.sd !== String(stock.peStdDev) ||
    draft.source !== (stock.sourceUrl || '') ||
    draft.asOf !== (stock.asOf || '');
  const build = () =>
    createManualStock({
      ...stock,
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      cmp: asNumber(draft.cmp),
      ttmEps: asNumber(draft.eps),
      peMean3Y: asNumber(draft.mean),
      peStdDev: asNumber(draft.sd),
      sourceUrl: draft.source || undefined,
      asOf: draft.asOf || undefined,
    });
  const save = () => {
    try {
      onSelectStock(build());
      setMessage('Model saved. Comparisons, scenarios and portfolio now use these inputs.');
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const download = () => {
    try {
      const record = build();
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              {
                model: record,
                bandMultiplier: k,
                methodology: 'Historical mean P/E scenario model',
                valuation: result,
              },
              null,
              2,
            ),
          ],
          { type: 'application/json' },
        ),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.ticker}-valuation.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const localMatches = stocks
    .filter((s) => `${s.ticker} ${s.name}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);
  return (
    <>
      <PageTitle title="Historical P/E comparison">
        Compare a share price with a model based on earnings and historical P/E.
      </PageTitle>
      <section className="stock-selection">
        <div className="company-title">
          <span className="company-initial">{stock.ticker.slice(0, 1)}</span>
          <div>
            <h2>{stock.name}</h2>
            <p>
              {stock.ticker} <span className="separator">/</span> {stock.sector}
            </p>
          </div>
        </div>
        <div className="stock-search">
          <label htmlFor="stock-search" className="sr-only">
            Search stocks
          </label>
          <Search size={18} />
          <input
            id="stock-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a company or ticker"
            autoComplete="off"
          />
          {search && (
            <div className="search-results">
              {localMatches.map((s) => (
                <button
                  key={s.ticker}
                  onClick={() => {
                    onSelectStock(s);
                    setSearch('');
                  }}
                >
                  <strong>{s.ticker}</strong>
                  <span>{s.name}</span>
                  <small>{s.sourceKind === 'manual' ? 'Your model' : 'Repository'}</small>
                </button>
              ))}
              {remote.map((s) => (
                <div className="remote-result" key={s.symbol}>
                  <strong>{s.symbol}</strong>
                  <span>{s.name}</span>
                  <small>Quote only. Use Import financials to add sourced fundamentals.</small>
                </div>
              ))}
              {remoteBusy && <p>Searching…</p>}
              {searchError && <p>{searchError}</p>}
              {!remoteBusy && !localMatches.length && !remote.length && (
                <p>No results. Use Import financials to create a model.</p>
              )}
            </div>
          )}
        </div>
      </section>
      <div className="quick-stocks" aria-label="Repository stock shortcuts">
        {stocks.slice(0, 8).map((s) => (
          <button
            aria-pressed={s.ticker === stock.ticker}
            key={s.ticker}
            onClick={() => onSelectStock(s)}
          >
            {s.ticker}
          </button>
        ))}
        <select
          aria-label="All saved stocks"
          value={stock.ticker}
          onChange={(e) => {
            const s = stocks.find((s) => s.ticker === e.target.value);
            if (s) onSelectStock(s);
          }}
        >
          {stocks.map((s) => (
            <option key={s.ticker} value={s.ticker}>
              {s.ticker} — {s.name}
            </option>
          ))}
        </select>
      </div>
      <SourceNote stock={stock} />
      {stock.sourceKind === 'manual' && (
        <button className="text-button remove-model" onClick={() => onRemoveModel(stock.ticker)}>
          Remove saved model
        </button>
      )}
      {stock.quote && (
        <div className="quote-card">
          <div>
            <strong>
              {stock.quote.status === 'unavailable'
                ? 'Quote unavailable'
                : `${stock.quote.status === 'stale' ? 'Stale' : 'Provider'} quote: ${money(stock.quote.cmp)}`}
            </strong>
            <small>
              {stock.quote.asOf
                ? `Market timestamp: ${new Date(stock.quote.asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
                : stock.quote.error}
            </small>
            <small>Yahoo Finance may be delayed. Financial inputs are refreshed separately.</small>
          </div>
          <button
            className="button subtle compact"
            disabled={stock.quote.status !== 'available' || stock.quote.cmp == null}
            onClick={() => update('cmp', String(stock.quote!.cmp))}
          >
            Use quote in this model
          </button>
        </div>
      )}
      <div className="calculator-layout">
        <section className="input-panel">
          <div className="panel-title">
            <h3>Review the inputs</h3>
            <button
              className="text-button"
              onClick={() => {
                setDraft(getDraft());
                setMessage('');
              }}
            >
              Reset
            </button>
          </div>
          <Field
            label="Market price (₹ per share)"
            value={draft.cmp}
            onChange={(v) => update('cmp', v)}
            hint="The price you want to compare. Quote refresh will not overwrite it."
          />
          <Field
            label="TTM EPS (₹ per share)"
            value={draft.eps}
            onChange={(v) => update('eps', v)}
            hint="Reported earnings per share for the latest four quarters."
          />
          <div className="two-fields">
            <Field
              label="Historical mean P/E"
              value={draft.mean}
              onChange={(v) => update('mean', v)}
              hint="Arithmetic mean, from a consistent historical period."
            />
            <Field
              label="P/E standard deviation"
              value={draft.sd}
              onChange={(v) => update('sd', v)}
              hint="Sample dispersion from the same observations."
            />
          </div>
          <div className="field">
            <label htmlFor="band-width">Band width</label>
            <select
              id="band-width"
              value={k}
              onChange={(e) => setConfidenceMultiplier(Number(e.target.value))}
            >
              <option value={1}>±1 standard deviation</option>
              <option value={1.645}>±1.645 standard deviations</option>
              <option value={1.96}>±1.96 standard deviations</option>
              <option value={2.5}>±2.5 standard deviations</option>
            </select>
            <small>Changes the scenario range, not the central model value.</small>
          </div>
          <details className="source-fields">
            <summary>Source & financial period</summary>
            <Field
              label="Source filing or data link"
              type="url"
              value={draft.source}
              onChange={(v) => update('source', v)}
              placeholder="https://…"
            />
            <Field
              label="Financial period end"
              type="date"
              value={draft.asOf}
              onChange={(v) => update('asOf', v)}
            />
            <p className="muted">
              A source link records where your input came from; it does not automatically verify it.
            </p>
          </details>
          <button className="button primary full" disabled={!result || !dirty} onClick={save}>
            <BookmarkCheck size={17} />
            Save model inputs
          </button>
          {message && <Notice>{message}</Notice>}
        </section>
        <div>
          {result ? (
            <ResultPanel
              result={result}
              title={dirty ? 'Unsaved scenario value' : 'Model value per share'}
            />
          ) : (
            <section className="result-panel empty-result">
              <h2>Check the inputs to calculate a value</h2>
              <Notice error>{error}</Notice>
              <p>
                For zero or negative TTM earnings, this P/E model is unavailable. A different
                valuation method is needed.
              </p>
            </section>
          )}
          <div className="result-actions">
            <button className="button subtle" disabled={!result} onClick={download}>
              <ArrowDownToLine size={16} />
              Export model
            </button>
            <button
              className="button subtle"
              disabled={dirty || !result}
              onClick={() => onAddToPortfolio(stock)}
            >
              <ArrowUpRight size={16} />
              Add to portfolio
            </button>
          </div>
        </div>
      </div>
      {result && (
        <details className="advanced-panel">
          <summary>Model assumptions & statistical detail</summary>
          <div className="detail-metrics">
            <div>
              <span>Current P/E</span>
              <strong>{num(result.currentPe)}×</strong>
            </div>
            <div>
              <span>P/E z-score</span>
              <strong>{num(result.zScore)}</strong>
            </div>
            <div>
              <span>Normal-model percentile</span>
              <strong>{num(result.normalPercentile)}%</strong>
            </div>
            <div>
              <span>Theoretical normal coverage</span>
              <strong>{num(result.theoreticalNormalCoverage)}%</strong>
            </div>
          </div>
          <p>
            The percentile locates today’s P/E in an assumed normal distribution. It is not a
            probability of a future price move. The coverage is theoretical, not a measured
            historical hit rate. Zero variance makes the z-score and percentile undefined.
          </p>
        </details>
      )}
    </>
  );
}
