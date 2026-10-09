import React, { useId } from 'react';
import type { EmpCalculationResult, StockData } from '../types/stock';

export const money = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v)
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(v);
export const num = (v: number | null | undefined, digits = 2) =>
  v == null || !Number.isFinite(v)
    ? '—'
    : new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(v);
export const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${num(v)}%`;
export function Field({
  label,
  value,
  onChange,
  hint,
  type = 'number',
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
export function SourceNote({ stock }: { stock: StockData }) {
  return (
    <div className="source-note">
      <span className={`badge ${stock.sourceKind === 'manual' ? 'blue' : 'amber'}`}>
        {stock.sourceKind === 'manual'
          ? 'User inputs'
          : stock.sourceKind === 'repository'
            ? 'Repository snapshot'
            : 'Example data'}
      </span>
      <span>
        {stock.sourceKind === 'manual'
          ? stock.asOf
            ? `Financial period: ${stock.asOf}`
            : 'Financial period not supplied'
          : stock.sourceKind === 'repository'
            ? 'Supplied repository data; source dates not independently verified'
            : 'Illustrative example values'}
      </span>
      {stock.sourceUrl && (
        <a href={stock.sourceUrl} target="_blank" rel="noreferrer">
          View source
        </a>
      )}
    </div>
  );
}
export function PageTitle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}
export function ResultPanel({
  result,
  title = 'Your model value',
}: {
  result: EmpCalculationResult;
  title?: string;
}) {
  const r = result;
  const min = Math.min(r.empLow, r.cmp) * 0.85;
  const max = Math.max(r.empHigh, r.cmp) * 1.1;
  const position = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <section className="result-panel" aria-label="Valuation results">
      <div className="result-heading">
        <span>{title}</span>
        <span className={`badge ${r.statusColor}`}>{r.statusLabel}</span>
      </div>
      <div className="fair-value">{money(r.emp)}</div>
      <p className="muted">per share, using the earnings and P/E assumptions you supplied</p>
      <div className="result-bands">
        <div>
          <span>Lower band</span>
          <strong>{money(r.empLow)}</strong>
        </div>
        <div>
          <span>Market price</span>
          <strong>{money(r.cmp)}</strong>
        </div>
        <div>
          <span>Upper band</span>
          <strong>{money(r.empHigh)}</strong>
        </div>
      </div>
      <div
        className="corridor"
        aria-label={`Lower ${money(r.empLow)}, model ${money(r.emp)}, upper ${money(r.empHigh)}, price ${money(r.cmp)}`}
      >
        <div
          className="corridor-range"
          style={{
            left: position(r.empLow),
            width: `${((r.empHigh - r.empLow) / (max - min)) * 100}%`,
          }}
        />
        <div className="model-marker" style={{ left: position(r.emp) }} />
        <div className="price-marker" style={{ left: position(r.cmp) }}>
          <span>Price</span>
        </div>
      </div>
      <div className="metric-pair">
        <div>
          <span>Price vs. model</span>
          <strong className={r.discountToEmp <= 0 ? 'positive' : 'negative'}>
            {pct(r.discountToEmp)}
          </strong>
          <small>Uses model value as the denominator</small>
        </div>
        <div>
          <span>Move to model value</span>
          <strong>{pct(r.targetUpsideToEmp)}</strong>
          <small>Uses current price as the denominator</small>
        </div>
      </div>
      <details className="calculation-details" open>
        <summary>See the calculation</summary>
        <dl>
          <div>
            <dt>Model value</dt>
            <dd>
              {num(r.ttmEps, 6)} × {num(r.peFair, 6)} = {money(r.emp)}
            </dd>
          </div>
          <div>
            <dt>Lower band</dt>
            <dd>
              EPS × max(0, mean P/E − {num(r.confidenceMultiplier)} × {num(r.peStdDev, 6)})
            </dd>
          </div>
          <div>
            <dt>Upper band</dt>
            <dd>
              EPS × (mean P/E + {num(r.confidenceMultiplier)} × {num(r.peStdDev, 6)})
            </dd>
          </div>
        </dl>
      </details>
      {r.lowerBandClamped && (
        <Notice>
          The mathematical lower band is negative and is displayed at ₹0. This wide dispersion
          weakens the usefulness of the model.
        </Notice>
      )}
      <p className="model-caveat">
        The bands describe a P/E scenario range. They do not predict returns or guarantee a recovery
        to the model value.
      </p>
    </section>
  );
}
