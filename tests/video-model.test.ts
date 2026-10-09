import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateVideoEmp, calculatePriceStdDev } from '../src/utils/videoEmpCalculator.ts';

const reference = {
  referencePrice: 200,
  referenceEps: 10,
  baseline: 120,
  priceStdDev: 10,
  bandMultiplier: 3,
};
test('reproduces the video slide: sensitive multiple 8, EMP240, low210 and high270', () => {
  const r = calculateVideoEmp(200, 15, reference);
  assert.equal(r.sensitivePortion, 80);
  assert.equal(r.sensitivityMultiple, 8);
  assert.equal(r.emp, 240);
  assert.equal(r.empLow, 210);
  assert.equal(r.empHigh, 270);
});
test('a baseline is required and is never inferred from the mean PE', () => {
  assert.throws(() =>
    calculateVideoEmp(200, 15, { ...reference, baseline: undefined as unknown as number }),
  );
});
test('zero new earnings leave the baseline intact rather than inventing EPS', () => {
  assert.equal(calculateVideoEmp(100, 0, reference).emp, 120);
  assert.equal(calculateVideoEmp(100, -5, reference).emp, 80);
});
test('rejects invalid reference data and nonpositive final valuations', () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => calculateVideoEmp(200, 15, { ...reference, referenceEps: bad }));
    assert.throws(() => calculateVideoEmp(bad, 15, reference));
  }
  assert.throws(() => calculateVideoEmp(200, 15, { ...reference, baseline: 201 }));
  assert.throws(() => calculateVideoEmp(200, 15, { ...reference, priceStdDev: -1 }));
  assert.throws(() => calculateVideoEmp(200, -100, reference));
});
test('supports zero volatility and explicitly clamps a negative lower band', () => {
  const flat = calculateVideoEmp(200, 15, { ...reference, priceStdDev: 0 });
  assert.equal(flat.empLow, 240);
  assert.equal(flat.empHigh, 240);
  const wide = calculateVideoEmp(200, 15, { ...reference, priceStdDev: 100 });
  assert.equal(wide.empLow, 0);
  assert.equal(wide.lowerBandClamped, true);
});
test('price volatility supports explicit sample and population denominators', () => {
  assert.equal(calculatePriceStdDev([90, 100, 110], 'sample'), 10);
  assert.ok(
    Math.abs(calculatePriceStdDev([90, 100, 110], 'population') - 8.16496580927726) < 1e-10,
  );
  assert.throws(() => calculatePriceStdDev([100], 'sample'));
});
