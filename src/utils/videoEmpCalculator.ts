import type { StockData, EmpCalculationResult } from '../types/stock';
import { calculateMean, calculateSampleStdDev, tryCalculateEmpBands } from './empCalculator';
import { canonicalTicker } from './symbols';

export interface VideoEmpParameters {
  referencePrice: number;
  referenceEps: number;
  baseline: number;
  priceStdDev: number;
  bandMultiplier: number;
  volatilityBasis?: 'supplied' | 'sample' | 'population';
  referencePeriod?: string;
  sourceUrl?: string;
}
export type ModelMethod = 'video' | 'pe';
export type ModelValues = Pick<
  EmpCalculationResult,
  | 'cmp'
  | 'emp'
  | 'empLow'
  | 'empHigh'
  | 'statusLabel'
  | 'statusColor'
  | 'discountToEmp'
  | 'targetUpsideToEmp'
  | 'lowerBandClamped'
>;
export interface VideoEmpResult extends ModelValues {
  baseline: number;
  sensitivePortion: number;
  sensitivityMultiple: number;
  ttmEps: number;
  priceStdDev: number;
  bandMultiplier: number;
}
function checked(value: number, label: string, minimum?: number) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (minimum !== undefined && value < minimum)
  )
    throw new Error(
      `${label} must be a finite number${minimum !== undefined ? ` of at least ${minimum}` : ''}.`,
    );
  return value;
}
export function calculateVideoEmp(
  cmp: number,
  ttmEps: number,
  p: VideoEmpParameters,
): VideoEmpResult {
  checked(cmp, 'Current price');
  if (cmp <= 0) throw new Error('Current price must be positive.');
  checked(ttmEps, 'Updated TTM EPS');
  checked(p.referencePrice, 'Reference price');
  if (p.referencePrice <= 0) throw new Error('Reference price must be positive.');
  checked(p.referenceEps, 'Reference TTM EPS');
  if (p.referenceEps <= 0) throw new Error('Reference TTM EPS must be positive.');
  checked(p.baseline, 'Profit-insensitive baseline', 0);
  if (p.baseline > p.referencePrice)
    throw new Error(
      'The baseline cannot exceed the reference price in the demonstrated positive-sensitivity model.',
    );
  checked(p.priceStdDev, 'Price standard deviation', 0);
  checked(p.bandMultiplier, 'Band multiplier');
  if (p.bandMultiplier <= 0) throw new Error('Band multiplier must be positive.');
  const sensitivePortion = p.referencePrice - p.baseline;
  const sensitivityMultiple = checked(sensitivePortion / p.referenceEps, 'Earnings sensitivity');
  const emp = checked(p.baseline + ttmEps * sensitivityMultiple, 'EMP');
  if (emp <= 0)
    throw new Error('These inputs produce a nonpositive EMP; the valuation is unavailable.');
  const rawLow = checked(emp - p.bandMultiplier * p.priceStdDev, 'Lower band');
  const empLow = Math.max(0, rawLow);
  const empHigh = checked(emp + p.bandMultiplier * p.priceStdDev, 'Upper band');
  const statusLabel =
    cmp < empLow
      ? 'Below the lower band'
      : cmp < emp
        ? 'Below the model value'
        : cmp <= empHigh
          ? 'Within the model range'
          : 'Above the upper band';
  return {
    cmp,
    ttmEps,
    emp,
    empLow,
    empHigh,
    baseline: p.baseline,
    sensitivePortion,
    sensitivityMultiple,
    priceStdDev: p.priceStdDev,
    bandMultiplier: p.bandMultiplier,
    lowerBandClamped: rawLow < 0,
    statusLabel,
    statusColor: cmp < emp ? 'teal' : cmp > empHigh ? 'rose' : 'blue',
    discountToEmp: checked((cmp / emp - 1) * 100, 'Price difference'),
    targetUpsideToEmp: checked((emp / cmp - 1) * 100, 'Move to model'),
  };
}
export function calculatePriceStdDev(prices: number[], basis: 'sample' | 'population') {
  if (prices.length < 2)
    throw new Error(
      'Supply at least two prices from the same previous-quarter observation period.',
    );
  prices.forEach((price) => {
    checked(price, 'Historical price');
    if (price <= 0) throw new Error('Historical prices must be positive.');
  });
  if (basis === 'sample') return calculateSampleStdDev(prices);
  if (basis !== 'population') throw new Error('Choose sample or population deviation explicitly.');
  const mean = calculateMean(prices);
  return checked(
    Math.sqrt(prices.reduce((sum, price) => sum + (price - mean) ** 2, 0) / prices.length),
    'Price standard deviation',
  );
}
export function stockValuation(
  stock: StockData,
  method: ModelMethod,
  k: number,
  models: Record<string, VideoEmpParameters>,
): { result: ModelValues | null; error: string } {
  if (method === 'pe')
    return tryCalculateEmpBands(stock.cmp, stock.ttmEps, stock.peMean3Y, stock.peStdDev, k);
  const p = models[canonicalTicker(stock.ticker)];
  if (!p)
    return {
      result: null,
      error: 'Supply the baseline and price-volatility inputs for this stock.',
    };
  try {
    return { result: calculateVideoEmp(stock.cmp, stock.ttmEps, p), error: '' };
  } catch (e) {
    return { result: null, error: (e as Error).message };
  }
}
export function readVideoModels(): Record<string, VideoEmpParameters> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('indian-stock-video-models-v1') || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const result: Record<string, VideoEmpParameters> = {};
    for (const [ticker, p] of Object.entries(data)) {
      try {
        calculateVideoEmp(1, 1, p);
        result[canonicalTicker(ticker)] = p;
      } catch {
        /* Invalid records are not used. */
      }
    }
    return result;
  } catch {
    return {};
  }
}
