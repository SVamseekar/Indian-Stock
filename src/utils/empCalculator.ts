import { EmpCalculationResult, ValuationStatus } from '../types/stock';

/**
 * Standard Normal Cumulative Distribution Function approximation (Abramowitz & Stegun)
 */
function standardNormalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absZ * absZ);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Computes arithmetic mean of an array of numbers
 */
export function calculateMean(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Number((sum / values.length).toFixed(2));
}

/**
 * Computes sample standard deviation (Bessel's correction n-1)
 */
export function calculateSampleStdDev(values: number[]): number {
  if (!values || values.length < 2) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Number(Math.sqrt(variance).toFixed(2));
}

/**
 * Calculates Statistical P/E Multiple Mean-Reversion Corridor and Equilibrium Fair Value Bands
 * 
 * Exact Mathematical Formulations:
 * 1. Current Multiple: P/E_current = CMP / TTM_EPS
 * 2. Equilibrium Fair Value: P_fair = TTM_EPS * PE_mean
 * 3. Upper Resistance Band: P_upper = TTM_EPS * (PE_mean + k * sigma)
 * 4. Lower Support Band: P_lower = TTM_EPS * (PE_mean - k * sigma)
 * 5. Z-Score: Z = (P/E_current - PE_mean) / sigma
 * 6. Historical Mean-Reversion Probability: Derived from standard normal CDF
 */
export function calculateEmpBands(
  cmp: number,
  ttmEps: number,
  peFair: number,
  peStdDev: number,
  confidenceMultiplier: number = 1.96
): EmpCalculationResult {
  const validCmp = Math.max(0.1, Number(cmp) || 1);
  const validEps = Number(ttmEps) || 1;
  const validPe = Math.max(1, Number(peFair) || 15);
  const validStdDev = Math.max(0.1, Number(peStdDev) || 2.5);
  const validK = Math.max(0.5, Number(confidenceMultiplier) || 1.96);

  // 1. Central Equilibrium Price
  const emp = Number((validEps * validPe).toFixed(2));

  // 2. Upper and Lower Corridor Bands
  const peUpper = validPe + validK * validStdDev;
  const peLower = Math.max(0.5, validPe - validK * validStdDev);

  const empHigh = Number((validEps * peUpper).toFixed(2));
  const empLow = Number((validEps * peLower).toFixed(2));

  // 3. Current Valuation Multiples
  const currentPe = Number((validCmp / validEps).toFixed(2));
  const zScore = Number(((currentPe - validPe) / validStdDev).toFixed(2));

  // 4. Coefficient of Variation (Valuation dispersion)
  const peDispersionPercent = Number(((validStdDev / validPe) * 100).toFixed(1));

  // 5. Statistical Reversion Probability
  // When stock is at EMP Low (Z <= -1.96), cumulative probability is ~2.5%, implying a 97.5% chance of reversion upward.
  let estimatedMeanReversionProbability: number;
  if (zScore <= 0) {
    // Underpriced: probability of moving up towards EMP
    estimatedMeanReversionProbability = Number(((1 - standardNormalCdf(zScore)) * 100).toFixed(1));
  } else {
    // Overpriced: probability of mean-reverting down to EMP
    estimatedMeanReversionProbability = Number((standardNormalCdf(zScore) * 100).toFixed(1));
  }

  // 6. Classification
  let status: ValuationStatus;
  let statusLabel: string;
  let statusColor: string;

  if (validCmp <= empLow) {
    status = 'DEEPLY_UNDERPRICED';
    statusLabel = 'Strong Buy / Deep Value (High Margin of Safety)';
    statusColor = 'emerald';
  } else if (validCmp < emp) {
    status = 'UNDERPRICED';
    statusLabel = 'Underpriced / Accumulate';
    statusColor = 'teal';
  } else if (validCmp < empHigh) {
    status = 'FAIR_VALUE';
    statusLabel = 'Fair Value / Hold / Monitor';
    statusColor = 'amber';
  } else {
    status = 'OVERPRICED';
    statusLabel = 'Overpriced / Sell or Switch';
    statusColor = 'rose';
  }

  // 7. Percentage Differentials
  const discountToEmp = Number((((validCmp - emp) / emp) * 100).toFixed(2));
  const discountToEmpLow = Number((((validCmp - empLow) / empLow) * 100).toFixed(2));

  // 8. Upside / Downside
  const targetUpsideToEmp = Number((((emp - validCmp) / validCmp) * 100).toFixed(2));
  const maxUpsideToEmpHigh = Number((((empHigh - validCmp) / validCmp) * 100).toFixed(2));
  const downsideRiskToEmpLow = validCmp > empLow
    ? Number((((validCmp - empLow) / validCmp) * 100).toFixed(2))
    : 0;

  // 9. Risk-Reward Ratio
  const riskRewardRatio = downsideRiskToEmpLow > 0
    ? Number((Math.max(0, targetUpsideToEmp) / downsideRiskToEmpLow).toFixed(2))
    : targetUpsideToEmp > 0 ? 99 : 0;

  // 10. Margin of Safety
  const marginOfSafetyPercent = Number((((emp - validCmp) / emp) * 100).toFixed(2));

  // 11. Historical Theoretical Hit Rate
  let historicalHitRate = 95.4;
  if (validK <= 1.0) historicalHitRate = 68.2;
  else if (validK <= 1.65) historicalHitRate = 90.0;
  else if (validK <= 2.0) historicalHitRate = 95.4;
  else historicalHitRate = 98.8;

  return {
    cmp: validCmp,
    ttmEps: validEps,
    peFair: validPe,
    peStdDev: validStdDev,
    confidenceMultiplier: validK,
    emp,
    empHigh,
    empLow,
    status,
    statusLabel,
    statusColor,
    discountToEmp,
    discountToEmpLow,
    targetUpsideToEmp,
    maxUpsideToEmpHigh,
    downsideRiskToEmpLow,
    riskRewardRatio,
    marginOfSafetyPercent,
    historicalHitRate,
    zScore,
    currentPe,
    peDispersionPercent,
    estimatedMeanReversionProbability,
  };
}

/**
 * Calculates TTM EPS from 4 quarters of Net Profit (₹ Cr) and Number of Shares (Cr)
 */
export function calculateTtmEpsFromQuarters(
  q1ProfitCr: number,
  q2ProfitCr: number,
  q3ProfitCr: number,
  q4ProfitCr: number,
  sharesCountCr: number
): { ttmProfitCr: number; ttmEps: number } {
  const ttmProfitCr = q1ProfitCr + q2ProfitCr + q3ProfitCr + q4ProfitCr;
  const ttmEps = sharesCountCr > 0 ? Number((ttmProfitCr / sharesCountCr).toFixed(2)) : 0;
  return { ttmProfitCr: Number(ttmProfitCr.toFixed(2)), ttmEps };
}

/**
 * Generates forward quarterly projections
 */
export function projectForwardQuarters(
  currentQuarterName: string,
  ttmEps: number,
  peFair: number,
  peStdDev: number,
  annualGrowthPercent: number = 15,
  confidenceMultiplier: number = 1.96,
  quartersAhead: number = 4
) {
  const quarterlyGrowthRate = Math.pow(1 + annualGrowthPercent / 100, 1 / 4) - 1;
  const projections = [];

  let nextEps = ttmEps;
  for (let i = 1; i <= quartersAhead; i++) {
    nextEps = Number((nextEps * (1 + quarterlyGrowthRate)).toFixed(2));
    const emp = Number((nextEps * peFair).toFixed(2));
    const empHigh = Number((nextEps * (peFair + confidenceMultiplier * peStdDev)).toFixed(2));
    const empLow = Number((nextEps * (peFair - confidenceMultiplier * peStdDev)).toFixed(2));

    projections.push({
      quarter: `+Q${i} Forward`,
      ttmEps: nextEps,
      emp,
      empHigh,
      empLow,
    });
  }

  return projections;
}
