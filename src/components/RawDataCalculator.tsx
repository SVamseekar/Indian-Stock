import { useState } from 'react';
import type { StockData } from '../types/stock';
import {
  calculateMean,
  calculateSampleStdDev,
  calculateTtmEpsFromQuarters,
  calculateEmpBands,
} from '../utils/empCalculator';
import { parsePeSeries } from '../utils/workspace';
import { Field, Notice, PageTitle, ResultPanel, money, num } from './shared';
export function RawDataCalculatorView({
  onApplyToMainCalculator,
}: {
  onApplyToMainCalculator: (data: Partial<StockData>) => void;
  onNavigateToTab?: (tab: 'calculator' | 'chart') => void;
}) {
  const [quarters, setQuarters] = useState(['', '', '', '']);
  const [shares, setShares] = useState('');
  const [cmp, setCmp] = useState('');
  const [series, setSeries] = useState('');
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [asOf, setAsOf] = useState('');
  const [consistent, setConsistent] = useState(false);
  const [message, setMessage] = useState('');
  let computed: {
    ttmEps: number;
    ttmProfitCr: number;
    mean: number;
    sd: number;
    count: number;
    result: ReturnType<typeof calculateEmpBands>;
  } | null = null;
  let error = '';
  try {
    if (quarters.some((q) => !q.trim()) || !shares.trim() || !cmp.trim())
      throw new Error(
        'Enter all four quarterly profits, weighted-average shares and market price.',
      );
    const eps = calculateTtmEpsFromQuarters(
      Number(quarters[0]),
      Number(quarters[1]),
      Number(quarters[2]),
      Number(quarters[3]),
      Number(shares),
    );
    const observations = parsePeSeries(series);
    const mean = calculateMean(observations),
      sd = calculateSampleStdDev(observations);
    computed = {
      ...eps,
      mean,
      sd,
      count: observations.length,
      result: calculateEmpBands(Number(cmp), eps.ttmEps, mean, sd),
    };
  } catch (e) {
    error = (e as Error).message;
  }
  const apply = () => {
    if (!computed || !consistent) return;
    try {
      onApplyToMainCalculator({
        ticker: ticker || undefined,
        name: name || 'Quarterly earnings model',
        cmp: Number(cmp),
        ttmEps: computed.ttmEps,
        peMean3Y: computed.mean,
        peStdDev: computed.sd,
        sourceUrl: source || undefined,
        asOf: asOf || undefined,
      });
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <>
      <PageTitle title="Build a model from earnings">
        Use four consecutive quarters of attributable profit and a consistent historical P/E series.
      </PageTitle>
      <div className="calculator-layout">
        <div className="input-panel">
          <div className="panel-title">
            <h3>Quarterly earnings</h3>
            <button
              className="text-button"
              onClick={() => {
                setQuarters(['100', '-20', '0', '40']);
                setShares('30');
                setCmp('100');
                setSeries('18, 20, 22, 20');
                setTicker('');
                setName('Example earnings model');
                setConsistent(false);
                setSource('');
                setAsOf('');
                setMessage('');
              }}
            >
              Load example
            </button>
          </div>
          <div className="two-fields">
            {quarters.map((q, i) => (
              <Field
                key={i}
                label={`Quarter ${i + 1} profit (₹ crore)`}
                value={q}
                onChange={(v) => setQuarters((prev) => prev.map((p, j) => (i === j ? v : p)))}
              />
            ))}
          </div>
          <p className="muted">
            Oldest to newest. Include zero and loss-making quarters. Use profit attributable to
            ordinary shareholders on the same reporting basis.
          </p>
          <Field
            label="Weighted-average shares (crore)"
            value={shares}
            onChange={setShares}
            hint="This shortcut requires a consistent share denominator for all four quarters."
          />
          <label className="check-label">
            <input
              type="checkbox"
              checked={consistent}
              onChange={(e) => setConsistent(e.target.checked)}
            />
            I checked the reporting basis, share count and split/bonus adjustments across these
            quarters.
          </label>
          <Notice>
            If the share count changed, use reported comparable quarterly EPS or reported TTM EPS.
            Dividing by today’s shares can misstate earnings per share.
          </Notice>
          <Field label="Market price (₹)" value={cmp} onChange={setCmp} />
          <div className="field">
            <label htmlFor="pe-series">Historical P/E observations</label>
            <textarea
              id="pe-series"
              rows={3}
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="18, 20, 22, 20"
            />
            <small>
              Positive P/E values from one consistent period and sampling frequency. At least two
              are required.
            </small>
          </div>
          <details className="source-fields">
            <summary>Identify your model & source</summary>
            <Field
              label="Ticker (optional)"
              type="text"
              value={ticker}
              onChange={setTicker}
              placeholder="TCS.NS or 500112.BO"
            />
            <Field label="Company or model name" type="text" value={name} onChange={setName} />
            <Field label="Source link" type="url" value={source} onChange={setSource} />
            <Field label="Latest quarter end" type="date" value={asOf} onChange={setAsOf} />
          </details>
          <button
            className="button primary full"
            disabled={!computed || !consistent}
            onClick={apply}
          >
            Use in fair value calculator
          </button>
          {message && <Notice error>{message}</Notice>}
        </div>
        <div>
          {computed ? (
            <>
              <div className="earnings-summary">
                <div>
                  <span>TTM profit</span>
                  <strong>{num(computed.ttmProfitCr)} crore</strong>
                </div>
                <div>
                  <span>TTM EPS</span>
                  <strong>{money(computed.ttmEps)}</strong>
                </div>
                <div>
                  <span>P/E observations</span>
                  <strong>{computed.count}</strong>
                </div>
                <div>
                  <span>Mean / sample deviation</span>
                  <strong>
                    {num(computed.mean)} / {num(computed.sd)}
                  </strong>
                </div>
              </div>
              <ResultPanel result={computed.result} />
            </>
          ) : (
            <div className="empty-panel">
              <h2>Your calculation will appear here</h2>
              <p>{error}</p>
              <p>
                The model uses the arithmetic mean and sample standard deviation, with n − 1 in the
                variance denominator.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
