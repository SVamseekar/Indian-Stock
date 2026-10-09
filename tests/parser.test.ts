import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScreenerText } from '../src/utils/screenerParser.ts';

test('extracts explicitly labelled TTM EPS, including a loss', () => {
  const r = parseScreenerText(
    'Example Ltd\nCurrent Price ₹ 1,250.50\nStock P/E 20.4\nEPS (TTM) ₹ -12.50',
  );
  assert.equal(r.cmp, 1250.5);
  assert.equal(r.ttmEps, -12.5);
});
test('does not mistake a quarterly or annual EPS table for TTM EPS', () => {
  const r = parseScreenerText('Example Ltd\nEPS in Rs 1.1 2.2 3.3 4.4');
  assert.equal(r.ttmEps, undefined);
});
test('keeps loss-making and zero quarters and the final value without trailing whitespace', () => {
  const r = parseScreenerText('Quarterly Net Profit (₹ Cr): 100 -20 0 40');
  assert.deepEqual(r.quarterlyProfits, [100, -20, 0, 40]);
  assert.equal(r.calculatedTtmProfit, 120);
});
test('rejects ambiguous annual net profit rows', () => {
  assert.equal(
    parseScreenerText('Profit & Loss\nNet Profit 100 200 300 400').quarterlyProfits,
    undefined,
  );
});
test('does not consume the next row as part of net profit', () => {
  const r = parseScreenerText('Quarterly Net Profit: 1 2 3 4\nEPS (TTM): 5');
  assert.deepEqual(r.quarterlyProfits, [1, 2, 3, 4]);
  assert.equal(r.ttmEps, 5);
});
test('imports Indian and western grouped amounts without reading numeric prefixes', () => {
  assert.equal(parseScreenerText('Current Price ₹ 1,23,456.78').cmp, 123456.78);
  assert.equal(parseScreenerText('Current Price ₹ 1,234,567.89').cmp, 1234567.89);
  assert.equal(parseScreenerText('EPS (TTM) ₹ 5oops').ttmEps, undefined);
  assert.equal(parseScreenerText('Current Price ₹ 1,23').cmp, undefined);
});
test('distinguishes quarter delimiters from grouped numbers', () => {
  assert.deepEqual(
    parseScreenerText('Quarterly Net Profit: 100,200,300,400').quarterlyProfits,
    [100, 200, 300, 400],
  );
  assert.deepEqual(
    parseScreenerText('Quarterly Net Profit: 1,000 2,000 -300 40').quarterlyProfits,
    [1000, 2000, -300, 40],
  );
});
