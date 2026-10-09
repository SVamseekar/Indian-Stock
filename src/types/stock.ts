export interface HistoricalQuarter {
  quarter: string;
  ttmEps: number;
  cmp: number;
  emp: number;
  empHigh: number;
  empLow: number;
}

export interface StockData {
  ticker: string;
  name: string;
  sector: string;
  cmp: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  change?: number;
  changePercent?: number;
  isLiveUpdated?: boolean;
  priceDirection?: 'up' | 'down' | 'neutral';
  ttmEps: number;
  peMean3Y: number;
  peMean5Y: number;
  peStdDev: number;
  peMin: number;
  peMax: number;
  roce: number;
  roe: number;
  salesGrowth3Y: number;
  profitGrowth3Y: number;
  debtToEquity: number;
  historicalQuarters: HistoricalQuarter[];
}

export type ValuationStatus = 
  | 'DEEPLY_UNDERPRICED' 
  | 'UNDERPRICED' 
  | 'FAIR_VALUE' 
  | 'OVERPRICED';

export interface EmpCalculationResult {
  cmp: number;
  ttmEps: number;
  peFair: number;
  peStdDev: number;
  confidenceMultiplier: number; // k (e.g. 1.0, 1.64, 1.96, 2.5)
  
  emp: number; // Central Expected Market Price
  empHigh: number; // Upper Resistance
  empLow: number; // Lower Support
  
  status: ValuationStatus;
  statusLabel: string;
  statusColor: string;
  
  discountToEmp: number; // % ((CMP - EMP) / EMP) * 100
  discountToEmpLow: number; // % ((CMP - EMP Low) / EMP Low) * 100
  
  targetUpsideToEmp: number; // % ((EMP - CMP) / CMP) * 100
  maxUpsideToEmpHigh: number; // % ((EMP High - CMP) / CMP) * 100
  downsideRiskToEmpLow: number; // % ((CMP - EMP Low) / CMP) * 100
  
  riskRewardRatio: number; // Upside to EMP / Downside to EMP Low
  marginOfSafetyPercent: number; // Margin of safety if bought at CMP
  historicalHitRate: number; // Estimated % hit rate (~95.4%)
  
  // Advanced Mathematical & Statistical Indicators
  zScore: number; // (P/E_current - P/E_mean) / sigma
  currentPe: number; // CMP / TTM EPS
  peDispersionPercent: number; // (StdDev / Mean) * 100 (Coefficient of Variation)
  estimatedMeanReversionProbability: number; // Statistical probability of reverting to EMP
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  quantity: number;
  avgBuyPrice: number;
  cmp: number;
  ttmEps: number;
  peFair: number;
  peStdDev: number;
}

export interface ScreenerParsedData {
  companyName?: string;
  ticker?: string;
  cmp?: number;
  marketCap?: number;
  ttmEps?: number;
  peCurrent?: number;
  high52?: number;
  low52?: number;
  bookValue?: number;
  roce?: number;
  roe?: number;
  quarterlyProfits?: number[]; // Net profits in ₹ Cr
  calculatedTtmProfit?: number; // Sum of last 4 quarters
  sharesCountCr?: number; // Equity shares in Cr
  rawTextFound?: string[];
}

export interface PipelineAlert {
  id: string;
  ticker: string;
  name: string;
  type: 'BUY_ZONE_ENTERED' | 'SELL_ZONE_ENTERED' | 'FAIR_PRICE_TOUCHED';
  cmp: number;
  targetPrice: number;
  timestamp: string;
  message: string;
}

export interface PipelineStatus {
  isAutoSyncing: boolean;
  intervalSeconds: number;
  lastSyncTime: string | null;
  syncCount: number;
  isConnected: boolean;
  monitoredEquitiesCount: number;
}
