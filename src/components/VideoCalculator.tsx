import { useEffect, useState, useRef } from 'react';
import type { StockData } from '../types/stock';
import {
  calculateVideoEmp,
  calculatePriceStdDev,
  type VideoEmpParameters,
} from '../utils/videoEmpCalculator';
import { Field, Notice, PageTitle, SourceNote, money, num, pct } from './shared';

const numeric = (value: string) => (value.trim() ? Number(value) : NaN);
interface Props {
  stocks: StockData[];
  selectedStock: StockData;
  parameters?: VideoEmpParameters;
  onSelectStock: (stock: StockData) => void;
  onSave: (parameters: VideoEmpParameters, cmp: number, eps: number) => void;
}
export function VideoCalculatorView({
  stocks,
  selectedStock: stock,
  parameters,
  onSelectStock,
  onSave,
}: Props) {
  const initial = () => {
    const previous = stock.historicalQuarters.at(-2);
    return {
      cmp: String(stock.cmp),
      eps: String(stock.ttmEps),
      referencePrice: String(parameters?.referencePrice ?? previous?.cmp ?? stock.cmp),
      referenceEps: String(parameters?.referenceEps ?? previous?.ttmEps ?? stock.ttmEps),
      baseline: parameters ? String(parameters.baseline) : '',
      sd: parameters ? String(parameters.priceStdDev) : '',
      k: String(parameters?.bandMultiplier ?? 3),
      period: parameters?.referencePeriod ?? previous?.quarter ?? '',
      source: parameters?.sourceUrl ?? '',
    };
  };
  const [draft, setDraft] = useState(initial);
  const [tutorial, setTutorial] = useState(false);
  const [prices, setPrices] = useState('');
  const [basis, setBasis] = useState<'sample' | 'population'>('sample');
  const [volatilityBasis, setVolatilityBasis] = useState<'supplied' | 'sample' | 'population'>(
    parameters?.volatilityBasis ?? 'supplied',
  );
  const [message, setMessage] = useState('');
  const previousTicker = useRef(stock.ticker);
  useEffect(() => {
    setDraft(initial());
    setTutorial(false);
    setPrices('');
    if (previousTicker.current !== stock.ticker) setMessage('');
    previousTicker.current = stock.ticker;
    setVolatilityBasis(parameters?.volatilityBasis ?? 'supplied');
  }, [stock.ticker, stock.cmp, stock.ttmEps, parameters]);
  const edit = (field: keyof typeof draft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setMessage('');
    if (field === 'sd') setVolatilityBasis('supplied');
  };
  const p: VideoEmpParameters = {
    referencePrice: numeric(draft.referencePrice),
    referenceEps: numeric(draft.referenceEps),
    baseline: numeric(draft.baseline),
    priceStdDev: numeric(draft.sd),
    bandMultiplier: numeric(draft.k),
    referencePeriod: draft.period || undefined,
    sourceUrl: draft.source || undefined,
    volatilityBasis,
  };
  let result: ReturnType<typeof calculateVideoEmp> | null = null;
  let error = '';
  try {
    result = calculateVideoEmp(numeric(draft.cmp), numeric(draft.eps), p);
  } catch (e) {
    error = (e as Error).message;
  }
  const save = () => {
    if (!result || tutorial) return;
    try {
      onSave(p, result.cmp, result.ttmEps);
      setMessage(
        'Video-method inputs saved. Comparisons, scenarios and portfolio use this stock model.',
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const deriveSd = () => {
    try {
      const values = prices
        .trim()
        .split(/[,;\s]+/)
        .map(Number);
      const sd = calculatePriceStdDev(values, basis);
      setDraft((d) => ({ ...d, sd: String(sd) }));
      setVolatilityBasis(basis);
      setMessage(
        `Price deviation calculated from ${values.length} supplied observations using the ${basis} denominator.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <>
      <PageTitle title="Video EMP calculator">
        Apply the two-component arithmetic shown in the video, using an explicitly supplied
        baseline.
      </PageTitle>
      <div className="model-topbar">
        <label className="stock-picker">
          Stock
          <select
            value={stock.ticker}
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
        <button
          className="button subtle"
          onClick={() => {
            setDraft({
              cmp: '200',
              eps: '15',
              referencePrice: '200',
              referenceEps: '10',
              baseline: '120',
              sd: '10',
              k: '3',
              period: 'Video example',
              source: 'https://www.youtube.com/watch?v=CboJkEiyR08&t=667',
            });
            setTutorial(true);
            setVolatilityBasis('supplied');
            setMessage('');
          }}
        >
          Load video example
        </button>
      </div>
      <SourceNote stock={stock} />
      {tutorial && (
        <Notice>
          Showing the video's tutorial numbers. These are not {stock.ticker} financial data and
          cannot be saved onto that stock. Reset to return to its inputs.
        </Notice>
      )}
      <div className="calculator-layout">
        <section className="input-panel">
          <div className="panel-title">
            <h3>Two-component inputs</h3>
            <button
              className="text-button"
              onClick={() => {
                setDraft(initial());
                setTutorial(false);
                setMessage('');
                setVolatilityBasis(parameters?.volatilityBasis ?? 'supplied');
              }}
            >
              Reset to stock
            </button>
          </div>
          <div className="two-fields">
            <Field
              label="Current comparison price (₹)"
              value={draft.cmp}
              onChange={(v) => edit('cmp', v)}
            />
            <Field
              label="Updated TTM EPS (₹)"
              value={draft.eps}
              onChange={(v) => edit('eps', v)}
              hint="Earnings after the new results. Zero or losses can be evaluated if the resulting EMP remains positive."
            />
          </div>
          <div className="two-fields">
            <Field
              label="Reference market price (₹)"
              value={draft.referencePrice}
              onChange={(v) => edit('referencePrice', v)}
            />
            <Field
              label="Reference TTM EPS (₹)"
              value={draft.referenceEps}
              onChange={(v) => edit('referenceEps', v)}
              hint="Price and earnings from the same earlier reference period."
            />
          </div>
          <Field
            label="Profit-insensitive baseline (₹ per share)"
            value={draft.baseline}
            onChange={(v) => edit('baseline', v)}
            hint="Required input. The video does not disclose how Vivekam determines it for a company."
          />
          <div className="two-fields">
            <Field
              label="Previous-quarter price deviation σ (₹)"
              value={draft.sd}
              onChange={(v) => edit('sd', v)}
              hint="Deviation of prices in rupees, not P/E variation."
            />
            <Field
              label="Band multiplier k"
              value={draft.k}
              onChange={(v) => edit('k', v)}
              hint="The worked video slide uses 3."
            />
          </div>
          <details className="source-fields">
            <summary>Calculate σ from supplied quarter prices</summary>
            <div className="field">
              <label htmlFor="quarter-prices">Prices within the previous quarter</label>
              <textarea
                id="quarter-prices"
                rows={3}
                value={prices}
                onChange={(e) => setPrices(e.target.value)}
                placeholder="90, 100, 110"
              />
              <small>
                Use a consistent sampling frequency and corporate-action basis. Do not substitute
                the nine quarterly prices for a daily quarter series.
              </small>
            </div>
            <div className="field">
              <label htmlFor="price-deviation-basis">Deviation denominator</label>
              <select
                id="price-deviation-basis"
                value={basis}
                onChange={(e) => setBasis(e.target.value as 'sample' | 'population')}
              >
                <option value="sample">Sample (n − 1)</option>
                <option value="population">Population (n)</option>
              </select>
              <small>
                The video does not specify the denominator; record the convention you choose.
              </small>
            </div>
            <button className="button subtle" onClick={deriveSd}>
              Calculate price deviation
            </button>
          </details>
          <details className="source-fields">
            <summary>Record the reference period & source</summary>
            <Field
              label="Reference period"
              type="text"
              value={draft.period}
              onChange={(v) => edit('period', v)}
              placeholder="Q4 FY24 or dated observation window"
            />
            <Field
              label="Model source link"
              type="url"
              value={draft.source}
              onChange={(v) => edit('source', v)}
            />
          </details>
          <button className="button primary full" disabled={!result || tutorial} onClick={save}>
            Save video-method inputs
          </button>
          {message && <Notice>{message}</Notice>}
        </section>
        <div>
          {result ? (
            <section className="result-panel" aria-label="Video EMP results">
              <div className="result-heading">
                <span>{tutorial ? 'Video worked example' : 'EMP from supplied inputs'}</span>
                <span className={`badge ${result.statusColor}`}>{result.statusLabel}</span>
              </div>
              <div className="fair-value">{money(result.emp)}</div>
              <p className="muted">Baseline + updated TTM EPS × earnings sensitivity</p>
              <div className="result-bands">
                <div>
                  <span>EMP Low</span>
                  <strong>{money(result.empLow)}</strong>
                </div>
                <div>
                  <span>Comparison price</span>
                  <strong>{money(result.cmp)}</strong>
                </div>
                <div>
                  <span>EMP High</span>
                  <strong>{money(result.empHigh)}</strong>
                </div>
              </div>
              <div className="metric-pair">
                <div>
                  <span>Reference profit-sensitive portion</span>
                  <strong>{money(result.sensitivePortion)}</strong>
                </div>
                <div>
                  <span>Earnings sensitivity</span>
                  <strong>{num(result.sensitivityMultiple, 6)}×</strong>
                </div>
              </div>
              <details className="calculation-details" open>
                <summary>See every calculation</summary>
                <dl>
                  <div>
                    <dt>Sensitive portion</dt>
                    <dd>
                      {num(p.referencePrice)} − {num(p.baseline)} = {money(result.sensitivePortion)}
                    </dd>
                  </div>
                  <div>
                    <dt>Sensitive multiple</dt>
                    <dd>
                      {num(result.sensitivePortion)} ÷ {num(p.referenceEps)} ={' '}
                      {num(result.sensitivityMultiple, 6)}×
                    </dd>
                  </div>
                  <div>
                    <dt>EMP</dt>
                    <dd>
                      {num(p.baseline)} + {num(result.ttmEps)} ×{' '}
                      {num(result.sensitivityMultiple, 6)} = {money(result.emp)}
                    </dd>
                  </div>
                  <div>
                    <dt>Upper band</dt>
                    <dd>
                      {num(result.emp)} + {num(p.bandMultiplier)} × {num(p.priceStdDev)} ={' '}
                      {money(result.empHigh)}
                    </dd>
                  </div>
                  <div>
                    <dt>Lower band</dt>
                    <dd>
                      max(0, {num(result.emp)} − {num(p.bandMultiplier)} × {num(p.priceStdDev)}) ={' '}
                      {money(result.empLow)}
                    </dd>
                  </div>
                </dl>
              </details>
              <div className="metric-pair">
                <div>
                  <span>Price vs. EMP</span>
                  <strong>{pct(result.discountToEmp)}</strong>
                </div>
                <div>
                  <span>Move to EMP</span>
                  <strong>{pct(result.targetUpsideToEmp)}</strong>
                </div>
              </div>
              {result.lowerBandClamped && (
                <Notice>The lower arithmetic band is negative and is displayed at ₹0.</Notice>
              )}
              <p className="model-caveat">
                This reproduces the demonstrated calculation when inputs are supplied. It does not
                derive Vivekam's proprietary baseline or inherit its reported historical coverage.
              </p>
            </section>
          ) : (
            <section className="empty-panel">
              <h2>Complete the baseline and volatility inputs</h2>
              <p>{error}</p>
              <p>
                Your stock's existing data is retained. A historical mean P/E cannot supply the
                missing baseline or price deviation.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setDraft({
                    cmp: '200',
                    eps: '15',
                    referencePrice: '200',
                    referenceEps: '10',
                    baseline: '120',
                    sd: '10',
                    k: '3',
                    period: 'Video example',
                    source: '',
                  });
                  setTutorial(true);
                  setVolatilityBasis('supplied');
                }}
              >
                Explore the video’s ₹240 example
              </button>
            </section>
          )}
          <section className="info-panel">
            <h3>Verified from the source</h3>
            <p>
              The{' '}
              <a
                href="https://www.youtube.com/watch?v=CboJkEiyR08&t=667"
                target="_blank"
                rel="noreferrer"
              >
                11:07 slide
              </a>{' '}
              shows ₹120 + ₹15 × 8 = ₹240. The{' '}
              <a
                href="https://www.youtube.com/watch?v=CboJkEiyR08&t=810"
                target="_blank"
                rel="noreferrer"
              >
                13:30 slide
              </a>{' '}
              uses ±3σ and a ₹10 price deviation to produce ₹210–₹270.
            </p>
            <p>
              Vivekam's public product pages describe quarterly forecasts, stock snapshots and
              growth-based rankings. This workspace uses your supplied parameters, with no claim of
              access to their licensed model.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
