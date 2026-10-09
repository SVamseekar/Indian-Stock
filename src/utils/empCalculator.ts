import type { EmpCalculationResult, ValuationStatus } from '../types/stock';

function finite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${name} must be a finite number.`);
  return value;
}
function positive(value: number, name: string): number {
  finite(value, name);
  if (value <= 0) throw new Error(`${name} must be greater than zero.`);
  return value;
}
function standardNormalCdf(z: number): number {
  if (z === 0) return 0.5;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}
export function calculateMean(values: number[]): number {
  if (!values.length) throw new Error('Enter at least one observation.');
  values.forEach((v) => finite(v, 'Observation'));
  return finite(values.reduce((total, v) => total + v, 0) / values.length, 'Mean');
}
export function calculateSampleStdDev(values: number[]): number {
  if (values.length < 2)
    throw new Error('Enter at least two observations to estimate standard deviation.');
  const mean = calculateMean(values);
  return finite(
    Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)),
    'Standard deviation',
  );
}

/** A historical P/E scenario model. No claim of forecast probability or proprietary EMP replication. */
export function calculateEmpBands(
  cmp: number,
  ttmEps: number,
  peFair: number,
  peStdDev: number,
  confidenceMultiplier = 1.96,
): EmpCalculationResult {
  positive(cmp, 'Market price');
  positive(ttmEps, 'TTM EPS (P/E valuation is unavailable for losses or zero earnings)');
  positive(peFair, 'Mean P/E');
  finite(peStdDev, 'P/E standard deviation');
  if (peStdDev < 0) throw new Error('P/E standard deviation cannot be negative.');
  positive(confidenceMultiplier, 'Band multiplier');
  const emp = finite(ttmEps * peFair, 'Model value');
  const rawLow = peFair - confidenceMultiplier * peStdDev;
  const empLow = finite(ttmEps * Math.max(0, rawLow), 'Lower band');
  const empHigh = finite(ttmEps * (peFair + confidenceMultiplier * peStdDev), 'Upper band');
  const currentPe = finite(cmp / ttmEps, 'Current P/E');
  const zScore = peStdDev === 0 ? null : finite((currentPe - peFair) / peStdDev, 'Z-score');
  const status: ValuationStatus =
    cmp === emp
      ? 'FAIR_VALUE'
      : cmp < empLow
        ? 'DEEPLY_UNDERPRICED'
        : cmp < emp
          ? 'UNDERPRICED'
          : cmp <= empHigh
            ? 'FAIR_VALUE'
            : 'OVERPRICED';
  const labels = {
    DEEPLY_UNDERPRICED: ['Below the lower band', 'teal'],
    UNDERPRICED: ['Below the model value', 'teal'],
    FAIR_VALUE: ['Within the model range', 'blue'],
    OVERPRICED: ['Above the upper band', 'rose'],
  };
  const targetUpsideToEmp = finite((emp / cmp - 1) * 100, 'Difference to model');
  const downsideRiskToEmpLow = finite(
    Math.max(0, (1 - empLow / cmp) * 100),
    'Distance to lower band',
  );
  const result: EmpCalculationResult = {
    cmp,
    ttmEps,
    peFair,
    peStdDev,
    confidenceMultiplier,
    emp,
    empLow,
    empHigh,
    lowerBandClamped: rawLow < 0,
    status,
    statusLabel: labels[status][0],
    statusColor: labels[status][1],
    discountToEmp: (cmp / emp - 1) * 100,
    discountToEmpLow: empLow === 0 ? null : (cmp / empLow - 1) * 100,
    targetUpsideToEmp,
    maxUpsideToEmpHigh: (empHigh / cmp - 1) * 100,
    downsideRiskToEmpLow,
    riskRewardRatio:
      downsideRiskToEmpLow > 0 ? Math.max(0, targetUpsideToEmp) / downsideRiskToEmpLow : null,
    marginOfSafetyPercent: (1 - cmp / emp) * 100,
    theoreticalNormalCoverage: (2 * standardNormalCdf(confidenceMultiplier) - 1) * 100,
    currentPe,
    zScore,
    peDispersionPercent: (peStdDev / peFair) * 100,
    normalPercentile: zScore === null ? null : standardNormalCdf(zScore) * 100,
  };
  Object.values(result).forEach((v) => {
    if (typeof v === 'number') finite(v, 'Calculated result');
  });
  return result;
}
export function tryCalculateEmpBands(cmp: number, eps: number, pe: number, sd: number, k = 1.96) {
  try {
    return { result: calculateEmpBands(cmp, eps, pe, sd, k), error: '' };
  } catch (e) {
    return { result: null, error: e instanceof Error ? e.message : 'Check the valuation inputs.' };
  }
}
/** Only valid with attributable earnings and consistent weighted-average shares across the four quarters. */
export function calculateTtmEpsFromQuarters(
  q1: number,
  q2: number,
  q3: number,
  q4: number,
  sharesCountCr: number,
) {
  [q1, q2, q3, q4].forEach((v) => finite(v, 'Quarterly profit'));
  positive(sharesCountCr, 'Weighted-average shares');
  const ttmProfitCr = finite(q1 + q2 + q3 + q4, 'TTM profit');
  return { ttmProfitCr, ttmEps: finite(ttmProfitCr / sharesCountCr, 'TTM EPS') };
}
export function projectForwardQuarters(
  _currentQuarterName: string,
  ttmEps: number,
  peFair: number,
  peStdDev: number,
  annualGrowthPercent = 15,
  confidenceMultiplier = 1.96,
  quartersAhead = 4,
) {
  finite(annualGrowthPercent, 'Scenario growth');
  if (annualGrowthPercent <= -100) throw new Error('Scenario growth must exceed -100%.');
  if (!Number.isInteger(quartersAhead) || quartersAhead < 1 || quartersAhead > 40)
    throw new Error('Choose between 1 and 40 quarters.');
  calculateEmpBands(1, ttmEps, peFair, peStdDev, confidenceMultiplier);
  return Array.from({ length: quartersAhead }, (_, i) => {
    const eps = ttmEps * (1 + annualGrowthPercent / 100) ** ((i + 1) / 4);
    const r = calculateEmpBands(1, eps, peFair, peStdDev, confidenceMultiplier);
    return {
      quarter: `+Q${i + 1} scenario`,
      ttmEps: eps,
      emp: r.emp,
      empLow: r.empLow,
      empHigh: r.empHigh,
    };
  });
}
