import type { ScreenerParsedData } from '../types/stock';

/** Accept entire numeric tokens, including Indian/western grouping; never accept a numeric prefix. */
function parseAmount(token: string): number | undefined {
  const valid =
    /^[+-]?(?:\d+(?:\.\d+)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d+)?)$/;
  if (!valid.test(token)) return undefined;
  const value = Number(token.replaceAll(',', ''));
  return Number.isFinite(value) ? value : undefined;
}
export function parseScreenerText(rawText: string): ScreenerParsedData {
  const result: ScreenerParsedData = { rawTextFound: [], warnings: [] };
  if (!rawText.trim()) return result;
  const fields: [keyof ScreenerParsedData, string, string][] = [
    ['cmp', '\\b(?:current\\s*price|cmp)\\b', 'Market price'],
    ['peCurrent', '\\b(?:stock\\s*p/e|p/e|pe)\\b', 'Current P/E'],
    [
      'ttmEps',
      '(?:\\beps\\s*\\(ttm\\)|\\bttm\\s*eps\\b|\\beps\\s*ttm\\b|\\btrailing\\s*eps\\b)',
      'TTM EPS',
    ],
    ['roce', '\\broce\\b', 'ROCE'],
    ['roe', '\\broe\\b', 'ROE'],
    ['marketCap', '\\bmarket\\s*cap\\b', 'Market cap'],
    ['bookValue', '\\bbook\\s*value\\b', 'Book value'],
  ];
  for (const [key, label, display] of fields) {
    const match = rawText.match(new RegExp(label + '[\\s:₹]*(?:Rs\\.?\\s*)?(\\S+)', 'i'));
    if (match) {
      const token = key === 'roce' || key === 'roe' ? match[1].replace(/%$/, '') : match[1];
      const value = parseAmount(token);
      if (value !== undefined) {
        (result as unknown as Record<string, unknown>)[key] = value;
        result.rawTextFound.push(`${display}: ${value}`);
      } else result.warnings.push(`${display} is not a complete valid number. Review it manually.`);
    }
  }
  const firstLine = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean);
  if (firstLine && firstLine.length < 100 && /\b(?:ltd|limited)\b/i.test(firstLine))
    result.companyName = firstLine;
  const row = rawText.match(
    /(?:^|\n)\s*quarterly\s*net\s*profit(?:\s*\([^\n)]*\))?\s*:?\s*([^\n\r]+)/i,
  );
  if (row) {
    // Whitespace-delimited amounts may contain grouping commas; a pure comma list is four ungrouped amounts.
    let tokens = row[1]
      .trim()
      .split(/\s+/)
      .map((v) => v.replace(/,$/, ''));
    if (tokens.length !== 4)
      tokens = row[1]
        .trim()
        .split(',')
        .map((v) => v.trim());
    const values = tokens.map(parseAmount);
    if (values.length === 4 && values.every((v): v is number => v !== undefined)) {
      result.quarterlyProfits = values;
      result.calculatedTtmProfit = values.reduce((a, b) => a + b, 0);
      result.rawTextFound.push(`Four quarterly profits: ${values.join(', ')}`);
    } else
      result.warnings.push(
        'Quarterly Net Profit must contain exactly four numeric values, oldest to newest. Remove annual totals and TTM columns.',
      );
  } else if (/net\s*profit/i.test(rawText))
    result.warnings.push(
      'Net profit row is ambiguous. Label the four confirmed quarters as “Quarterly Net Profit:”.',
    );
  if (result.ttmEps === undefined)
    result.warnings.push(
      'No explicitly labelled TTM EPS found. Enter reported TTM EPS or use the quarterly earnings builder.',
    );
  result.warnings.push(
    'Review imported values against the source filing before applying. Historical mean P/E and standard deviation must be supplied separately.',
  );
  return result;
}
