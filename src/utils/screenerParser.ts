import { ScreenerParsedData } from '../types/stock';

/**
 * Deterministic parser for raw text copied from Screener.in, Moneycontrol, or NSE
 * Extracts fundamental metrics using regex pattern matching without any AI.
 */
export function parseScreenerText(rawText: string): ScreenerParsedData {
  const result: ScreenerParsedData = {
    rawTextFound: [],
  };

  if (!rawText || !rawText.trim()) {
    return result;
  }

  const text = rawText.replace(/,/g, ''); // Remove commas from numbers like 3,950 -> 3950

  // 1. Current Market Price (CMP)
  // Matches "Current Price ₹ 3950" or "Price: 3950" or "CMP: 3950" or "CMP ₹ 3950"
  const cmpMatch = text.match(/(?:current\s*price|cmp|price)[\s:₹rs\.]*([\d]+(?:\.[\d]+)?)/i);
  if (cmpMatch && cmpMatch[1]) {
    result.cmp = parseFloat(cmpMatch[1]);
    result.rawTextFound?.push(`CMP: ₹${result.cmp}`);
  }

  // 2. Stock P/E
  // Matches "Stock P/E 30.7" or "P/E: 30.7" or "PE: 29.8"
  const peMatch = text.match(/(?:stock\s*p[\s\/]*e|p[\s\/]*e|pe)[\s:x]*([\d]+(?:\.[\d]+)?)/i);
  if (peMatch && peMatch[1]) {
    result.peCurrent = parseFloat(peMatch[1]);
    result.rawTextFound?.push(`P/E: ${result.peCurrent}x`);
  }

  // 3. TTM EPS
  // Matches "EPS (TTM) ₹ 128.5" or "TTM EPS: 128.5" or "EPS in Rs: 128.5" or "EPS 128.5"
  const epsMatch = text.match(/(?:eps\s*(?:\(ttm\)|in\s*rs|ttm)?|trailing\s*eps)[\s:₹rs\.]*([\d]+(?:\.[\d]+)?)/i);
  if (epsMatch && epsMatch[1]) {
    result.ttmEps = parseFloat(epsMatch[1]);
    result.rawTextFound?.push(`TTM EPS: ₹${result.ttmEps}`);
  }

  // 4. ROCE
  const roceMatch = text.match(/roce[\s:₹\.]*([\d]+(?:\.[\d]+)?)\s*%/i);
  if (roceMatch && roceMatch[1]) {
    result.roce = parseFloat(roceMatch[1]);
    result.rawTextFound?.push(`ROCE: ${result.roce}%`);
  }

  // 5. ROE
  const roeMatch = text.match(/roe[\s:₹\.]*([\d]+(?:\.[\d]+)?)\s*%/i);
  if (roeMatch && roeMatch[1]) {
    result.roe = parseFloat(roeMatch[1]);
    result.rawTextFound?.push(`ROE: ${result.roe}%`);
  }

  // 6. Book Value
  const bvMatch = text.match(/book\s*value[\s:₹rs\.]*([\d]+(?:\.[\d]+)?)/i);
  if (bvMatch && bvMatch[1]) {
    result.bookValue = parseFloat(bvMatch[1]);
  }

  // 7. Market Cap
  const mcapMatch = text.match(/market\s*cap[\s:₹rs\.]*([\d]+(?:\.[\d]+)?)\s*(?:cr|crore)?/i);
  if (mcapMatch && mcapMatch[1]) {
    result.marketCap = parseFloat(mcapMatch[1]);
  }

  // 8. 52-Week High / Low
  const highLowMatch = text.match(/high\s*[\/\\]\s*low[\s:₹rs\.]*([\d]+(?:\.[\d]+)?)\s*[\/\\]\s*([\d]+(?:\.[\d]+)?)/i);
  if (highLowMatch && highLowMatch[1] && highLowMatch[2]) {
    result.high52 = parseFloat(highLowMatch[1]);
    result.low52 = parseFloat(highLowMatch[2]);
    result.rawTextFound?.push(`52W High/Low: ₹${result.high52} / ₹${result.low52}`);
  }

  // 9. Look for Net Profit sequence (e.g. from Screener quarterly results row)
  // Example: "Net Profit 11074 11342 12040 12420"
  const netProfitRowMatch = text.match(/net\s*profit[^\n\r\d]*((?:[\d]+(?:\.[\d]+)?[\s\t,]+){3,})/i);
  if (netProfitRowMatch && netProfitRowMatch[1]) {
    const numbers = netProfitRowMatch[1].trim().split(/[\s\t]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    if (numbers.length >= 4) {
      // Take the last 4 quarters
      const last4 = numbers.slice(-4);
      result.quarterlyProfits = last4;
      result.calculatedTtmProfit = Number(last4.reduce((a, b) => a + b, 0).toFixed(2));
      result.rawTextFound?.push(`Last 4Q Net Profits: ${last4.join(' + ')} = ₹${result.calculatedTtmProfit} Cr`);
    }
  }

  // 10. Look for Company Name at top or first line
  const lines = rawText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length < 60 && !firstLine.includes(':') && !firstLine.includes('=')) {
      result.companyName = firstLine.replace(/ltd|limited/i, 'Ltd').trim();
    }
  }

  return result;
}
