import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEmpBands,
  calculateMean,
  calculateSampleStdDev,
  calculateTtmEpsFromQuarters,
  projectForwardQuarters,
} from '../src/utils/empCalculator.ts';

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
test('uses unrounded earnings and multiples throughout valuation', () => {
  const r = calculateEmpBands(100, 12.345, 20.123, 3.456, 1.96);
  near(r.emp, 248.418435);
  near(r.empLow, 164.7963678);
  near(r.empHigh, 332.0405022);
});
test('rejects missing, nonfinite and nonpositive price, EPS and mean instead of inventing inputs', () => {
  for (const v of [0, -1, NaN, Infinity]) {
    assert.throws(() => calculateEmpBands(v, 10, 20, 3));
    assert.throws(() => calculateEmpBands(100, v, 20, 3));
    assert.throws(() => calculateEmpBands(100, 10, v, 3));
  }
  assert.throws(() => calculateEmpBands(100, 10, 20, -1));
  assert.throws(() => calculateEmpBands(100, 10, 20, 3, 0));
});
test('supports zero variance without a fake z-score or reversion probability', () => {
  const r = calculateEmpBands(100, 10, 20, 0);
  assert.equal(r.empLow, 200);
  assert.equal(r.empHigh, 200);
  assert.equal(r.zScore, null);
  assert.equal(r.normalPercentile, null);
  assert.equal(r.riskRewardRatio, null);
  assert.equal('estimatedMeanReversionProbability' in r, false);
});
test('clamps a negative lower band explicitly and avoids division by zero', () => {
  const r = calculateEmpBands(100, 10, 1, 5);
  assert.equal(r.empLow, 0);
  assert.equal(r.lowerBandClamped, true);
  assert.equal(r.discountToEmpLow, null);
});
test('normal coverage is a model assumption and accurate for arbitrary multipliers', () => {
  const r = calculateEmpBands(200, 10, 20, 3, 1.96);
  assert.ok(Math.abs(r.theoreticalNormalCoverage - 95.0004) < 0.001);
  assert.ok(
    Math.abs(calculateEmpBands(200, 10, 20, 3, 2.5).theoreticalNormalCoverage - 98.7581) < 0.001,
  );
  assert.equal(r.status, 'FAIR_VALUE');
});
test('statistics preserve precision and require enough valid observations', () => {
  near(calculateMean([1.001, 1.002]), 1.0015);
  near(calculateSampleStdDev([1, 2, 3]), 1);
  assert.equal(calculateSampleStdDev([2, 2]), 0);
  assert.throws(() => calculateMean([]));
  assert.throws(() => calculateSampleStdDev([1]));
  assert.throws(() => calculateMean([1, NaN]));
});
test('TTM profit includes losses and validates shares', () => {
  const r = calculateTtmEpsFromQuarters(100, -20, 0, 40, 30);
  assert.equal(r.ttmProfitCr, 120);
  assert.equal(r.ttmEps, 4);
  assert.throws(() => calculateTtmEpsFromQuarters(1, 2, 3, 4, 0));
});
test('annual scenario growth compounds without quarterly rounding drift', () => {
  const p = projectForwardQuarters('current', 10.123, 20, 3, 12, 1.96, 4);
  near(p[3].ttmEps, 11.33776);
  assert.throws(() => projectForwardQuarters('current', 10, 20, 3, -100));
});
