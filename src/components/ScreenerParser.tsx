import { useState } from 'react';
import type { StockData } from '../types/stock';
import { parseScreenerText } from '../utils/screenerParser';
import { tryCalculateEmpBands } from '../utils/empCalculator';
import { Field, Notice, PageTitle, ResultPanel, num } from './shared';
const example =
  'Example Company Ltd\nCurrent Price ₹ 100\nEPS (TTM) ₹ 5\nStock P/E 20\nQuarterly Net Profit: 100 -20 0 40';
export function ScreenerParserView({
  onApplyToCalculator,
  onNavigateToTab,
}: {
  onApplyToCalculator: (s: Partial<StockData>) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart' | 'raw_modeler') => void;
}) {
  const [text, setText] = useState('');
  const [cmp, setCmp] = useState('');
  const [eps, setEps] = useState('');
  const [mean, setMean] = useState('');
  const [sd, setSd] = useState('');
  const [ticker, setTicker] = useState('');
  const [source, setSource] = useState('');
  const [asOf, setAsOf] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState('');
  const parsed = parseScreenerText(text);
  const editText = (v: string) => {
    setText(v);
    const p = parseScreenerText(v);
    setCmp(p.cmp === undefined ? '' : String(p.cmp));
    setEps(p.ttmEps === undefined ? '' : String(p.ttmEps));
    setReviewed(false);
    setMessage('');
  };
  const { result, error } = tryCalculateEmpBands(
    cmp.trim() ? Number(cmp) : NaN,
    eps.trim() ? Number(eps) : NaN,
    mean.trim() ? Number(mean) : NaN,
    sd.trim() ? Number(sd) : NaN,
  );
  const apply = () => {
    if (!result || !reviewed) return;
    try {
      onApplyToCalculator({
        ticker: ticker || undefined,
        name: parsed.companyName || 'Imported financial model',
        cmp: result.cmp,
        ttmEps: result.ttmEps,
        peMean3Y: result.peFair,
        peStdDev: result.peStdDev,
        sourceUrl: source || undefined,
        asOf: asOf || undefined,
      });
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <>
      <PageTitle title="Import financials">
        Paste financial text, review extracted values, and supply historical P/E assumptions.
      </PageTitle>
      <div className="calculator-layout">
        <section className="input-panel">
          <div className="panel-title">
            <h3>Paste source text</h3>
            <button
              className="text-button"
              onClick={() => {
                editText(example);
                setMean('20');
                setSd('3');
                setTicker('');
                setSource('');
                setAsOf('');
              }}
            >
              Load example
            </button>
          </div>
          <div className="field">
            <label htmlFor="financial-text">Financial text from Screener or a filing</label>
            <textarea
              id="financial-text"
              rows={8}
              value={text}
              onChange={(e) => editText(e.target.value)}
              placeholder={'Company Ltd\nCurrent Price ₹ 100\nEPS (TTM) ₹ 5'}
            />
            <small>
              Only explicitly labelled TTM EPS is imported. Quarterly and annual EPS rows need
              manual review.
            </small>
          </div>
          {parsed.rawTextFound.length > 0 && (
            <div className="extracted-values">
              <h4>Extracted values</h4>
              {parsed.rawTextFound.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          {parsed.warnings.map((w, i) => (
            <p className="import-warning" key={i}>
              {w}
            </p>
          ))}
          <div className="two-fields">
            <Field
              label="Review market price (₹)"
              value={cmp}
              onChange={(v) => {
                setCmp(v);
                setReviewed(false);
              }}
            />
            <Field
              label="Review TTM EPS (₹)"
              value={eps}
              onChange={(v) => {
                setEps(v);
                setReviewed(false);
              }}
            />
            <Field
              label="Historical mean P/E"
              value={mean}
              onChange={(v) => {
                setMean(v);
                setReviewed(false);
              }}
            />
            <Field
              label="P/E standard deviation"
              value={sd}
              onChange={(v) => {
                setSd(v);
                setReviewed(false);
              }}
            />
          </div>
          <Notice>
            The current P/E is not the historical mean. It cannot be used to independently estimate
            a fair value from the same price.
          </Notice>
          <Field
            label="Ticker (optional, include exchange)"
            type="text"
            value={ticker}
            onChange={setTicker}
            placeholder="TCS.NS or 500112.BO"
          />
          <Field label="Source link" type="url" value={source} onChange={setSource} />
          <Field label="Financial period end" type="date" value={asOf} onChange={setAsOf} />
          <label className="check-label">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed these values and their financial periods against the source.
          </label>
          <button className="button primary full" disabled={!result || !reviewed} onClick={apply}>
            Use in fair value calculator
          </button>
          {message && <Notice error>{message}</Notice>}
        </section>
        <div>
          {result ? (
            <ResultPanel result={result} />
          ) : (
            <section className="empty-panel">
              <h2>Review the required values</h2>
              <p>{error}</p>
              <p>
                Paste a price and explicitly labelled TTM EPS, then enter the mean and dispersion of
                a historical P/E series.
              </p>
              <button className="button subtle" onClick={() => onNavigateToTab('raw_modeler')}>
                Build EPS from quarterly earnings
              </button>
            </section>
          )}
          {parsed.quarterlyProfits && (
            <div className="info-panel">
              <h3>Four quarterly profits found</h3>
              <p>
                {parsed.quarterlyProfits.map((v) => num(v)).join(' + ')} ={' '}
                {num(parsed.calculatedTtmProfit)} crore.
              </p>
              <p>
                No share count is assumed. Use the earnings builder to calculate EPS after checking
                the denominator.
              </p>
              <button className="text-button" onClick={() => onNavigateToTab('raw_modeler')}>
                Open earnings builder
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
