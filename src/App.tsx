import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StockData, PipelineStatus, PipelineAlert } from './types/stock';
import { DEFAULT_STOCKS } from './data/defaultStocks';
import { Navbar, TabType } from './components/Navbar';
import { PipelineBanner } from './components/PipelineBanner';
import { CalculatorView } from './components/Calculator';
import { PeasChart } from './components/PeasChart';
import { ScreenerParserView } from './components/ScreenerParser';
import { RawDataCalculatorView } from './components/RawDataCalculator';
import { TopRanksView } from './components/TopRanks';
import { PortfolioScannerView } from './components/PortfolioScanner';
import { PeasExplainerView } from './components/PeasExplainer';
import { ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [stocks, setStocks] = useState<StockData[]>(DEFAULT_STOCKS);
  const [selectedStock, setSelectedStock] = useState<StockData>(DEFAULT_STOCKS[0]);
  const [confidenceMultiplier, setConfidenceMultiplier] = useState<number>(1.96);
  const [growthEstimate, setGrowthEstimate] = useState<number>(12);

  // Automated Pipeline State
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(10);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState<number>(1);
  const [pipelineAlerts, setPipelineAlerts] = useState<PipelineAlert[]>([]);

  // Keep ref to stocks so executePipeline has stable function reference
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  // Pipeline execution logic: fetches live quotes and updates all valuations
  const executePipeline = useCallback(async () => {
    try {
      const currentTickers = stocksRef.current.map((s) => s.ticker).join(',');
      const res = await fetch(`/api/live-quotes?tickers=${encodeURIComponent(currentTickers)}`);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.quotes) {
          const quotes = data.quotes;
          const newAlerts: PipelineAlert[] = [];
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          setStocks((prevStocks) => {
            let hasChanged = false;
            const updated = prevStocks.map((stock) => {
              const live = quotes[stock.ticker];
              if (!live) return stock;

              const oldCmp = stock.cmp;
              const newCmp = live.cmp;
              const direction: 'up' | 'down' | 'neutral' = newCmp > oldCmp ? 'up' : newCmp < oldCmp ? 'down' : 'neutral';

              // Check if stock crossed EMP Low (Buy Zone) or EMP High (Sell Zone)
              const empLow = live.empLow;
              const empHigh = live.empHigh;

              if (newCmp <= empLow && oldCmp > empLow) {
                newAlerts.push({
                  id: `${stock.ticker}-${Date.now()}`,
                  ticker: stock.ticker,
                  name: stock.name,
                  type: 'BUY_ZONE_ENTERED',
                  cmp: newCmp,
                  targetPrice: empLow,
                  timestamp: nowStr,
                  message: `Touched EMP Low ₹${empLow}. Statistical ~95% margin-of-safety Buy zone activated.`,
                });
              } else if (newCmp >= empHigh && oldCmp < empHigh) {
                newAlerts.push({
                  id: `${stock.ticker}-${Date.now()}`,
                  ticker: stock.ticker,
                  name: stock.name,
                  type: 'SELL_ZONE_ENTERED',
                  cmp: newCmp,
                  targetPrice: empHigh,
                  timestamp: nowStr,
                  message: `Surpassed EMP High ₹${empHigh}. Flagged for profit-booking / switch reallocation.`,
                });
              }

              if (stock.cmp === newCmp && stock.change === live.change && stock.isLiveUpdated) {
                return stock;
              }

              hasChanged = true;
              return {
                ...stock,
                cmp: newCmp,
                previousClose: live.previousClose,
                dayHigh: live.dayHigh,
                dayLow: live.dayLow,
                change: live.change,
                changePercent: live.changePercent,
                isLiveUpdated: true,
                priceDirection: direction,
              };
            });

            return hasChanged ? updated : prevStocks;
          });

          // Also update selected stock if matching and changed
          setSelectedStock((current) => {
            const live = quotes[current.ticker];
            if (live && (current.cmp !== live.cmp || current.change !== live.change)) {
              return {
                ...current,
                cmp: live.cmp,
                previousClose: live.previousClose,
                dayHigh: live.dayHigh,
                dayLow: live.dayLow,
                change: live.change,
                changePercent: live.changePercent,
                isLiveUpdated: true,
              };
            }
            return current;
          });

          if (newAlerts.length > 0) {
            setPipelineAlerts((prev) => [...newAlerts, ...prev].slice(0, 20));
          }

          setLastSyncTime(nowStr);
          setSyncCount((c) => c + 1);
        }
      }
    } catch (err) {
      console.warn('Pipeline execution encountered transient error:', err);
    }
  }, []);

  // Automated background polling pipeline
  useEffect(() => {
    executePipeline();

    if (!isAutoSyncing) return;

    const timer = setInterval(() => {
      executePipeline();
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [isAutoSyncing, intervalSeconds, executePipeline]);

  const handleSelectStock = (stk: StockData) => {
    if (!stocks.some((s) => s.ticker === stk.ticker)) {
      setStocks((prev) => [stk, ...prev]);
    }
    setSelectedStock(stk);
  };

  const handleApplyExtractedData = (extracted: Partial<StockData>) => {
    const ticker = extracted.ticker || 'CUSTOM';
    const existing = stocks.find((s) => s.ticker === ticker);

    const updatedStock: StockData = existing ? {
      ...existing,
      cmp: extracted.cmp || existing.cmp,
      ttmEps: extracted.ttmEps || existing.ttmEps,
      peMean3Y: extracted.peMean3Y || existing.peMean3Y,
      peStdDev: extracted.peStdDev || existing.peStdDev,
    } : {
      ticker,
      name: extracted.name || 'Parsed Equity',
      sector: 'NSE Equities',
      cmp: extracted.cmp || 1000,
      ttmEps: extracted.ttmEps || 50,
      peMean3Y: extracted.peMean3Y || 20,
      peMean5Y: extracted.peMean3Y || 20,
      peStdDev: extracted.peStdDev || 3,
      peMin: 12,
      peMax: 35,
      roce: extracted.roce || 18,
      roe: extracted.roe || 16,
      salesGrowth3Y: 12,
      profitGrowth3Y: 10,
      debtToEquity: 0.1,
      historicalQuarters: [
        { quarter: 'Q1', ttmEps: (extracted.ttmEps || 50) * 0.88, cmp: (extracted.cmp || 1000) * 0.9, emp: (extracted.ttmEps || 50) * 0.88 * 20, empHigh: (extracted.ttmEps || 50) * 0.88 * 25, empLow: (extracted.ttmEps || 50) * 0.88 * 15 },
        { quarter: 'Q2', ttmEps: (extracted.ttmEps || 50) * 0.92, cmp: (extracted.cmp || 1000) * 0.94, emp: (extracted.ttmEps || 50) * 0.92 * 20, empHigh: (extracted.ttmEps || 50) * 0.92 * 25, empLow: (extracted.ttmEps || 50) * 0.92 * 15 },
        { quarter: 'Q3', ttmEps: (extracted.ttmEps || 50) * 0.96, cmp: (extracted.cmp || 1000) * 0.97, emp: (extracted.ttmEps || 50) * 0.96 * 20, empHigh: (extracted.ttmEps || 50) * 0.96 * 25, empLow: (extracted.ttmEps || 50) * 0.96 * 15 },
        { quarter: 'Q4 (Current)', ttmEps: extracted.ttmEps || 50, cmp: extracted.cmp || 1000, emp: (extracted.ttmEps || 50) * 20, empHigh: (extracted.ttmEps || 50) * 25, empLow: (extracted.ttmEps || 50) * 15 },
      ],
    };

    if (!existing) {
      setStocks([updatedStock, ...stocks]);
    }
    setSelectedStock(updatedStock);
  };

  const handleAddToPortfolio = (stk: StockData) => {
    setSelectedStock(stk);
    setActiveTab('portfolio');
  };

  const pipelineStatus: PipelineStatus = {
    isAutoSyncing,
    intervalSeconds,
    lastSyncTime,
    syncCount,
    isConnected: true,
    monitoredEquitiesCount: stocks.length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedTicker={selectedStock.ticker}
      />

      {/* Automatic Market Streaming Pipeline Banner */}
      <PipelineBanner
        stocks={stocks}
        pipelineStatus={pipelineStatus}
        alerts={pipelineAlerts}
        onTriggerSync={executePipeline}
        onToggleAutoSync={() => setIsAutoSyncing((prev) => !prev)}
        onChangeInterval={(sec) => setIntervalSeconds(sec)}
        onSelectStock={handleSelectStock}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'calculator' && (
          <CalculatorView
            stocks={stocks}
            selectedStock={selectedStock}
            onSelectStock={handleSelectStock}
            onAddToPortfolio={handleAddToPortfolio}
            confidenceMultiplier={confidenceMultiplier}
            setConfidenceMultiplier={setConfidenceMultiplier}
          />
        )}

        {activeTab === 'chart' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Historical Multi-Quarter P/E Valuation Corridor
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizing equilibrium fair value, upper resistance (+1.96σ), and lower support (-1.96σ) boundaries over time.
                </p>
              </div>

              {/* Stock switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Select Stock:</span>
                <select
                  value={selectedStock.ticker}
                  onChange={(e) => {
                    const found = stocks.find((s) => s.ticker === e.target.value);
                    if (found) setSelectedStock(found);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {stocks.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} ({s.name}) - CMP: ₹{s.cmp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <PeasChart
              stock={selectedStock}
              confidenceMultiplier={confidenceMultiplier}
              growthEstimate={growthEstimate}
            />

            {/* Jump to calculator */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Want to tweak parameters or inspect sensitivity for {selectedStock.ticker}?
              </span>
              <button
                onClick={() => setActiveTab('calculator')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open Calculator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'screener_parser' && (
          <ScreenerParserView
            onApplyToCalculator={handleApplyExtractedData}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'raw_modeler' && (
          <RawDataCalculatorView
            onApplyToMainCalculator={handleApplyExtractedData}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'top_ranks' && (
          <TopRanksView
            stocks={stocks}
            confidenceMultiplier={confidenceMultiplier}
            onSelectStock={handleSelectStock}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioScannerView
            stocks={stocks}
            confidenceMultiplier={confidenceMultiplier}
            onSelectStock={handleSelectStock}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'guide' && <PeasExplainerView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Quantitative Valuation Corridor &amp; P/E Bands Terminal</span>
            <span>•</span>
            <span>Automated Market Ingestion Pipeline</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Feed: Live NSE &bull; Polling: Active &bull; Zero Manual Input</span>
            <span>Confidence Interval: 95% (k=1.96&sigma;)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
