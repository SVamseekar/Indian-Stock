import { useState } from 'react';
import type { StockData } from '../types/stock';
import { projectForwardQuarters, tryCalculateEmpBands } from '../utils/empCalculator';
import {
  calculateVideoEmp,
  type ModelMethod,
  type VideoEmpParameters,
} from '../utils/videoEmpCalculator';
import { Field, Notice, money, num } from './shared';
export function PeasChart({
  stock,
  confidenceMultiplier,
  method,
  parameters,
}: {
  stock: StockData;
  confidenceMultiplier: number;
  method: ModelMethod;
  parameters?: VideoEmpParameters;
  growthEstimate?: number;
}) {
  const [growth, setGrowth] = useState('0');
  let points: ReturnType<typeof projectForwardQuarters> = [];
  let error = '';
  try {
    if (!growth.trim()) throw new Error('Enter an annual EPS growth assumption.');
    if (method === 'video') {
      if (!parameters)
        throw new Error(
          'Supply the baseline and price deviation in Video EMP before generating its scenarios.',
        );
      const rate = Number(growth);
      if (!Number.isFinite(rate) || rate <= -100)
        throw new Error('Scenario growth must be finite and exceed -100%.');
      points = Array.from({ length: 5 }, (_, i) => {
        const eps = stock.ttmEps * (1 + rate / 100) ** (i / 4);
        const r = calculateVideoEmp(stock.cmp, eps, parameters);
        return {
          quarter: i === 0 ? 'Current' : `+Q${i} scenario`,
          ttmEps: eps,
          emp: r.emp,
          empLow: r.empLow,
          empHigh: r.empHigh,
        };
      });
    } else {
      const forward = projectForwardQuarters(
        'Current',
        stock.ttmEps,
        stock.peMean3Y,
        stock.peStdDev,
        Number(growth),
        confidenceMultiplier,
      );
      const { result } = tryCalculateEmpBands(
        stock.cmp,
        stock.ttmEps,
        stock.peMean3Y,
        stock.peStdDev,
        confidenceMultiplier,
      );
      if (result)
        points = [
          {
            quarter: 'Current',
            ttmEps: stock.ttmEps,
            emp: result.emp,
            empLow: result.empLow,
            empHigh: result.empHigh,
          },
          ...forward,
        ];
    }
  } catch (e) {
    error = (e as Error).message;
  }
  const W = 850,
    H = 300,
    left = 80,
    right = 22,
    top = 30,
    bottom = 40;
  const max = points.length ? Math.max(...points.map((p) => p.empHigh)) * 1.1 : 1;
  const x = (i: number) => left + (i / 4) * (W - left - right);
  const y = (v: number) => H - bottom - (v / max) * (H - top - bottom);
  const path = (key: 'emp' | 'empLow' | 'empHigh') =>
    points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[key])}`).join(' ');
  const area = points.length
    ? `${path('empHigh')} ${[...points]
        .reverse()
        .map((p, i) => `L${x(points.length - 1 - i)},${y(p.empLow)}`)
        .join(' ')} Z`
    : '';
  return (
    <>
      <section className="chart-panel">
        <div className="chart-heading">
          <div>
            <h2>Earnings growth scenario</h2>
            <p>
              {method === 'video'
                ? 'Keep the supplied baseline, earnings sensitivity and price deviation fixed while varying EPS.'
                : 'Keep historical P/E assumptions fixed and explore a different EPS path.'}
            </p>
          </div>
          <Field label="Annual EPS growth (%)" value={growth} onChange={setGrowth} />
        </div>
        {error ? (
          <Notice error>{error}</Notice>
        ) : (
          <>
            <div className="chart-legend">
              <span className="legend model">Model value</span>
              <span className="legend range">
                {method === 'video' ? 'Video-method price range' : 'P/E scenario range'}
              </span>
            </div>
            <svg
              className="valuation-chart"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`Four-quarter valuation scenario for ${stock.name} at ${growth}% annual EPS growth. Exact values follow in the table.`}
            >
              {Array.from({ length: 5 }, (_, i) => (max * i) / 4).map((v) => (
                <g key={v}>
                  <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke="#e2e8ef" />
                  <text x={left - 10} y={y(v) + 4} textAnchor="end" fill="#5a697c" fontSize="12">
                    ₹{num(v, 0)}
                  </text>
                </g>
              ))}
              <path d={area} fill="#e0edf8" />
              <path d={path('empHigh')} fill="none" stroke="#89aecd" strokeDasharray="6 5" />
              <path d={path('empLow')} fill="none" stroke="#89aecd" strokeDasharray="6 5" />
              <path
                d={path('emp')}
                fill="none"
                stroke="#245c9a"
                strokeWidth="3"
                strokeDasharray="7 4"
              />
              {points.map((p, i) => (
                <g key={p.quarter}>
                  <circle cx={x(i)} cy={y(p.emp)} r="4" fill="#245c9a" />
                  <text x={x(i)} y={H - 12} textAnchor="middle" fill="#5a697c" fontSize="12">
                    {i === 0 ? 'Current' : `+Q${i}`}
                  </text>
                </g>
              ))}
            </svg>
            <Notice>
              Future values are hypothetical EPS scenarios, not price forecasts. Growth compounds as
              EPS × (1 + annual growth)^(quarter / 4).
            </Notice>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Scenario values per share</caption>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Scenario EPS</th>
                    <th>Lower band</th>
                    <th>Model value</th>
                    <th>Upper band</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.quarter}>
                      <th scope="row">{p.quarter}</th>
                      <td>{money(p.ttmEps)}</td>
                      <td>{money(p.empLow)}</td>
                      <td>{money(p.emp)}</td>
                      <td>{money(p.empHigh)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <section className="info-panel">
        <h2>
          {stock.sourceKind === 'manual'
            ? 'Historical observations'
            : 'Original repository observations'}
        </h2>
        {stock.historicalQuarters.length ? (
          <>
            <p>
              The original stored bands are preserved below. Recomputed P/E values are separate
              comparisons applied retrospectively; they are not a point-in-time backtest.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Price</th>
                    <th>TTM EPS</th>
                    <th>Original stored EMP</th>
                    <th>Original stored low</th>
                    <th>Original stored high</th>
                    <th>P/E comparison value</th>
                    <th>Range</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.historicalQuarters.map((h) => {
                    const { result } = tryCalculateEmpBands(
                      h.cmp,
                      h.ttmEps,
                      stock.peMean3Y,
                      stock.peStdDev,
                      confidenceMultiplier,
                    );
                    return (
                      <tr key={h.quarter}>
                        <th scope="row">{h.quarter}</th>
                        <td>{money(h.cmp)}</td>
                        <td>{money(h.ttmEps)}</td>
                        <td>{money(h.emp)}</td>
                        <td>{money(h.empLow)}</td>
                        <td>{money(h.empHigh)}</td>
                        <td>{money(result?.emp)}</td>
                        <td>
                          {result
                            ? `${money(result.empLow)} – ${money(result.empHigh)}`
                            : 'Unavailable'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>
            No historical observations were supplied. The app does not generate a fictional price or
            earnings history for imported models.
          </p>
        )}
      </section>
    </>
  );
}
