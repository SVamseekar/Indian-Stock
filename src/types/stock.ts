export interface HistoricalQuarter {
  quarter: string;
  ttmEps: number;
  cmp: number;
  emp?: number;
  empHigh?: number;
  empLow?: number;
}
export interface StockData {
  ticker: string;
  name: string;
  sector: string;
  cmp: number;
  ttmEps: number;
  peMean3Y: number;
  peMean5Y: number | null;
  peStdDev: number;
  peMin: number | null;
  peMax: number | null;
  roce: number | null;
  roe: number | null;
  salesGrowth3Y: number | null;
  profitGrowth3Y: number | null;
  debtToEquity: number | null;
  historicalQuarters: HistoricalQuarter[];
  sourceKind?: 'demo' | 'manual' | 'repository';
  sourceUrl?: string;
  asOf?: string;
  quote?: MarketQuote;
}
export type ValuationStatus = 'DEEPLY_UNDERPRICED' | 'UNDERPRICED' | 'FAIR_VALUE' | 'OVERPRICED';
export interface EmpCalculationResult {
  cmp: number;
  ttmEps: number;
  peFair: number;
  peStdDev: number;
  confidenceMultiplier: number;
  emp: number;
  empHigh: number;
  empLow: number;
  lowerBandClamped: boolean;
  status: ValuationStatus;
  statusLabel: string;
  statusColor: string;
  discountToEmp: number;
  discountToEmpLow: number | null;
  targetUpsideToEmp: number;
  maxUpsideToEmpHigh: number;
  downsideRiskToEmpLow: number;
  riskRewardRatio: number | null;
  marginOfSafetyPercent: number;
  theoreticalNormalCoverage: number;
  zScore: number | null;
  currentPe: number;
  peDispersionPercent: number;
  normalPercentile: number | null;
}
export interface MarketQuote {
  symbol: string;
  status: 'available' | 'stale' | 'unavailable';
  source: 'Yahoo Finance';
  cmp: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  asOf: string | null;
  fetchedAt: string | null;
  fromCache: boolean;
  error?: string;
}
export interface PortfolioHolding {
  id: string;
  ticker: string;
  quantity: number;
  avgBuyPrice: number;
}
export interface ScreenerParsedData {
  companyName?: string;
  cmp?: number;
  marketCap?: number;
  ttmEps?: number;
  peCurrent?: number;
  high52?: number;
  low52?: number;
  bookValue?: number;
  roce?: number;
  roe?: number;
  quarterlyProfits?: number[];
  calculatedTtmProfit?: number;
  rawTextFound: string[];
  warnings: string[];
}
