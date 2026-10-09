import React, { useState, useId, useMemo, useRef } from 'react';
import { StockData, EmpCalculationResult } from '../types/stock';
import { calculateEmpBands } from '../utils/empCalculator';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2, 
  RefreshCw,
  Search,
  ArrowRightLeft,
  Sliders,
  Percent,
  Binary
} from 'lucide-react';

interface CalculatorProps {
  stocks: StockData[];
  selectedStock: StockData;
  onSelectStock: (stock: StockData) => void;
  onAddToPortfolio: (stock: StockData) => void;
  confidenceMultiplier: number;
  setConfidenceMultiplier: (val: number) => void;
}

export const CalculatorView: React.FC<CalculatorProps> = ({
  stocks,
  selectedStock,
  onSelectStock,
  onAddToPortfolio,
  confidenceMultiplier,
  setConfidenceMultiplier,
}) => {
  // Input fields state (initialized from selected stock)
  const [cmp, setCmp] = useState<number>(selectedStock.cmp);
  const [ttmEps, setTtmEps] = useState<number>(selectedStock.ttmEps);
  const [peFair, setPeFair] = useState<number>(selectedStock.peMean3Y);
  const [peStdDev, setPeStdDev] = useState<number>(selectedStock.peStdDev);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSensitivity, setShowSensitivity] = useState(true);

  // Accessible IDs
  const cmpInputId = useId();
  const ttmEpsInputId = useId();
  const peFairInputId = useId();
  const peStdDevInputId = useId();

  // Keep ref to stocks so effects don't re-run when stocks array updates
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  // Sync state when selectedStock changes externally (using primitives to avoid object ref thrashing)
  React.useEffect(() => {
    setCmp(selectedStock.cmp);
    setTtmEps(selectedStock.ttmEps);
    setPeFair(selectedStock.peMean3Y);
    setPeStdDev(selectedStock.peStdDev);
  }, [selectedStock.ticker, selectedStock.cmp, selectedStock.ttmEps, selectedStock.peMean3Y, selectedStock.peStdDev]);

  // Compute live mathematical result
  const result: EmpCalculationResult = calculateEmpBands(
    cmp,
    ttmEps,
    peFair,
    peStdDev,
    confidenceMultiplier
  );

  // Filter stocks for quick search dropdown (memoized)
  const filteredStocks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return stocks.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.ticker.toLowerCase().includes(term)
    );
  }, [stocks, searchTerm]);

  const [remoteMatches, setRemoteMatches] = useState<any[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  // Debounced remote search - depends ONLY on searchTerm
  React.useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setRemoteMatches((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingRemote(true);
        const res = await fetch(`/api/search-tickers?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.results)) {
            const localTickers = new Set(stocksRef.current.map((s) => s.ticker.toUpperCase()));
            const remoteOnly = data.results.filter((r: any) => !localTickers.has(r.ticker.toUpperCase()));
            setRemoteMatches(remoteOnly);
          }
        }
      } catch (err) {
        console.warn('Remote search error:', err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectRemoteStock = async (ticker: string) => {
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stock) {
          onSelectStock(data.stock);
          setSearchTerm('');
          setRemoteMatches([]);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load remote ticker:', e);
    }
  };

  // Position percentage on visual corridor bar
  const minCorridorVal = Math.min(result.empLow * 0.9, cmp * 0.9);
  const maxCorridorVal = Math.max(result.empHigh * 1.1, cmp * 1.1);
  const range = maxCorridorVal - minCorridorVal;
  const cmpPos = Math.max(3, Math.min(97, ((cmp - minCorridorVal) / range) * 100));
  const empLowPos = ((result.empLow - minCorridorVal) / range) * 100;
  const empPos = ((result.emp - minCorridorVal) / range) * 100;
  const empHighPos = ((result.empHigh - minCorridorVal) / range) * 100;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-xs font-mono border border-amber-500/30">
                Institutional Quant Model
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Fair Value = TTM EPS &times; Historical Mean P/E &plusmn; k&middot;&sigma;
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
              Statistical P/E Valuation Corridor &amp; Fair Value Calculator
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Calculates equilibrium fair market value (P* Fair Price), upper resistance ceiling (+1.96&sigma;), and lower margin-of-safety support floor (-1.96&sigma;) using verified NSE corporate filings.
            </p>
          </div>

          {/* Stock Search & Preset Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search 32+ bluechips or type ANY NSE/BSE ticker..."
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {searchTerm && (filteredStocks.length > 0 || remoteMatches.length > 0 || isSearchingRemote) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-800/80">
                  {/* Preloaded Bluechip matches */}
                  {filteredStocks.map((stk) => (
                    <button
                      key={stk.ticker}
                      onClick={() => {
                        onSelectStock(stk);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-400">{stk.ticker}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-mono">Pre-Calculated</span>
                      </div>
                      <span className="text-slate-400 truncate max-w-[130px]">{stk.name}</span>
                    </button>
                  ))}

                  {/* Dynamically fetched NSE/BSE tickers */}
                  {remoteMatches.map((item) => (
                    <button
                      key={item.symbol || item.ticker}
                      onClick={() => handleSelectRemoteStock(item.ticker)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 flex items-center justify-between cursor-pointer bg-slate-950/40"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-indigo-300">{item.ticker}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-mono">NSE Live Feed</span>
                      </div>
                      <span className="text-slate-400 truncate max-w-[130px]">{item.name}</span>
                    </button>
                  ))}

                  {isSearchingRemote && (
                    <div className="px-3 py-2 text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Searching 2,000+ NSE &amp; BSE equities pipeline...
                    </div>
                  )}
                </div>
              )}
            </div>

            <select
              value={selectedStock.ticker}
              onChange={(e) => {
                const found = stocks.find((s) => s.ticker === e.target.value);
                if (found) onSelectStock(found);
              }}
              className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} - {s.name} (CMP ₹{s.cmp} | Fair ₹{Math.round(s.ttmEps * s.peMean3Y)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1-Click Quick Stock Buttons (Zero-Effort Selection) */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-mono mb-2 flex items-center justify-between">
            <span>⚡ Instant 1-Click Equities (Fully Pre-Calculated):</span>
            <span className="text-emerald-400">Click any stock to see its Fair Price instantly</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {stocks.map((stk) => {
              const isSelected = stk.ticker === selectedStock.ticker;
              const fair = Math.round(stk.ttmEps * stk.peMean3Y);
              const isUnderpriced = stk.cmp < fair;

              return (
                <button
                  key={stk.ticker}
                  onClick={() => onSelectStock(stk)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : isUnderpriced
                      ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{stk.ticker}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                    ₹{fair}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Input Parameters (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-slate-200 text-sm">Fundamental Inputs</h3>
            </div>
            <button
              onClick={() => {
                setCmp(selectedStock.cmp);
                setTtmEps(selectedStock.ttmEps);
                setPeFair(selectedStock.peMean3Y);
                setPeStdDev(selectedStock.peStdDev);
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to {selectedStock.ticker}</span>
            </button>
          </div>

          {/* Current Market Price (CMP) with Live Pipeline Status */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor={cmpInputId} className="font-medium text-slate-300 flex items-center gap-1.5">
                <span>Current Market Price (CMP)</span>
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE PIPELINE</span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                {selectedStock.changePercent !== undefined && (
                  <span
                    className={`font-mono font-bold text-xs ${
                      selectedStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {selectedStock.changePercent >= 0 ? '+' : ''}
                    {selectedStock.changePercent}%
                  </span>
                )}
                <span className="font-mono text-emerald-400 font-bold">₹{cmp}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">₹</span>
                <input
                  id={cmpInputId}
                  type="number"
                  step="0.5"
                  value={cmp}
                  onChange={(e) => setCmp(Math.max(0.1, Number(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Live Day Range if available from pipeline */}
            {selectedStock.dayHigh && selectedStock.dayLow && (
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                <span>24h Low: <strong className="text-slate-300">₹{selectedStock.dayLow}</strong></span>
                <span>Prev Close: <strong className="text-slate-300">₹{selectedStock.previousClose || cmp}</strong></span>
                <span>24h High: <strong className="text-slate-300">₹{selectedStock.dayHigh}</strong></span>
              </div>
            )}
          </div>

          {/* TTM EPS */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor={ttmEpsInputId} className="font-medium text-slate-300">
                Trailing 12-Month EPS (TTM EPS)
              </label>
              <span className="font-mono text-indigo-400 font-bold">₹{ttmEps}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">₹</span>
                <input
                  id={ttmEpsInputId}
                  type="number"
                  step="0.1"
                  value={ttmEps}
                  onChange={(e) => setTtmEps(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Free source: Screener.in &gt; Profit &amp; Loss &gt; EPS (TTM)
            </p>
          </div>

          {/* Historical Fair P/E Multiple */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor={peFairInputId} className="font-medium text-slate-300">
                Historical Fair P/E Multiple (Mean / Median)
              </label>
              <span className="font-mono text-amber-400 font-bold">{peFair}x</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={peFairInputId}
                type="number"
                step="0.1"
                min="1"
                max="150"
                value={peFair}
                onChange={(e) => setPeFair(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Quick:</span>
              <button
                onClick={() => setPeFair(selectedStock.peMean3Y)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                3Y ({selectedStock.peMean3Y}x)
              </button>
              <button
                onClick={() => setPeFair(selectedStock.peMean5Y)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                5Y ({selectedStock.peMean5Y}x)
              </button>
            </div>
          </div>

          {/* P/E Volatility / Standard Deviation */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor={peStdDevInputId} className="font-medium text-slate-300">
                P/E Volatility / Standard Deviation (&sigma;)
              </label>
              <span className="font-mono text-slate-300 font-bold">&plusmn;{peStdDev}</span>
            </div>
            <input
              id={peStdDevInputId}
              type="number"
              step="0.1"
              min="0.2"
              max="25"
              value={peStdDev}
              onChange={(e) => setPeStdDev(Math.max(0.2, Number(e.target.value) || 0.2))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Confidence Multiplier (k) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-300">
                Corridor Width Multiplier (k)
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {confidenceMultiplier}&sigma; ({result.historicalHitRate}%)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
              {[
                { label: '68% (1.0σ)', val: 1.0 },
                { label: '90% (1.64σ)', val: 1.64 },
                { label: '95% (1.96σ)', val: 1.96, badge: '95% CI' },
                { label: '99% (2.5σ)', val: 2.5 },
              ].map((b) => (
                <button
                  key={b.val}
                  onClick={() => setConfidenceMultiplier(b.val)}
                  className={`py-1.5 px-1 rounded-lg text-center cursor-pointer transition-colors relative ${
                    confidenceMultiplier === b.val
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <div className="text-[10px] leading-tight">{b.label}</div>
                  {b.badge && (
                    <span className="absolute -top-1.5 right-1 px-1 py-0.2 bg-amber-500 text-slate-950 font-sans text-[8px] font-bold rounded">
                      Standard
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Calculated EMP Bands & Math Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Key Takeaway Banner: Direct Fair Price Callout */}
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-lg">
                ₹
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-bold">
                  Calculated Fair Price
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
                  ₹{result.emp}{' '}
                  <span className="text-xs font-normal text-slate-400 font-sans">
                    (Central EMP Equilibrium)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                Buy Zone: &le; ₹{result.empLow}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/60">
                Sell Zone: &ge; ₹{result.empHigh}
              </span>
            </div>
          </div>

          {/* Status Decision Banner */}
          <div
            className={`rounded-2xl p-5 border shadow-xl relative overflow-hidden ${
              result.status === 'DEEPLY_UNDERPRICED'
                ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-700/60 shadow-emerald-950/30'
                : result.status === 'UNDERPRICED'
                ? 'bg-gradient-to-r from-teal-950/80 to-slate-900 border-teal-700/60 shadow-teal-950/30'
                : result.status === 'FAIR_VALUE'
                ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-700/60 shadow-amber-950/30'
                : 'bg-gradient-to-r from-rose-950/80 to-slate-900 border-rose-700/60 shadow-rose-950/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                    result.status === 'DEEPLY_UNDERPRICED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : result.status === 'UNDERPRICED'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                      : result.status === 'FAIR_VALUE'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {result.status === 'DEEPLY_UNDERPRICED' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : result.status === 'UNDERPRICED' ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : result.status === 'FAIR_VALUE' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-mono tracking-wider uppercase text-slate-300">
                    Mathematical Signal
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-100">
                    {result.statusLabel}
                  </h3>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onAddToPortfolio(selectedStock)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add to Portfolio Scanner</span>
              </button>
            </div>

            {/* Rationale text with exact figures */}
            <p className="mt-3 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
              {result.status === 'DEEPLY_UNDERPRICED' && (
                <>
                  CMP of <strong>₹{cmp}</strong> trades at or below EMP Low (<strong>₹{result.empLow}</strong>). Z-Score is <strong>{result.zScore}&sigma;</strong> below mean multiple. Historical data indicates a ~{result.historicalHitRate}% reversion probability toward central EMP of <strong>₹{result.emp}</strong> (+{result.targetUpsideToEmp}% upside).
                </>
              )}
              {result.status === 'UNDERPRICED' && (
                <>
                  CMP of <strong>₹{cmp}</strong> is discounted by {Math.abs(result.discountToEmp)}% below equilibrium EMP of <strong>₹{result.emp}</strong>. Risk-reward is favorable at {result.riskRewardRatio}:1 with only {result.downsideRiskToEmpLow}% downside to the lower boundary.
                </>
              )}
              {result.status === 'FAIR_VALUE' && (
                <>
                  CMP of <strong>₹{cmp}</strong> is situated between central EMP (₹{result.emp}) and upper resistance EMP High (₹{result.empHigh}). Fair valuation hold.
                </>
              )}
              {result.status === 'OVERPRICED' && (
                <>
                  CMP of <strong>₹{cmp}</strong> has breached upper boundary EMP High (<strong>₹{result.empHigh}</strong>). PE multiple is stretched at {result.currentPe}x (Z-Score: +{result.zScore}&sigma;). Optimal candidate for profit-booking or switching.
                </>
              )}
            </p>
          </div>

          {/* The 3 Core Output Cards (EMP Low, Central EMP, EMP High) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* EMP Low */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>EMP Low Band</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                  Buy Support
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                ₹{result.empLow}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {cmp <= result.empLow ? (
                  <span className="text-emerald-400 font-semibold">
                    Discounted by {Math.abs(result.discountToEmpLow)}%
                  </span>
                ) : (
                  <span>Downside risk: {result.downsideRiskToEmpLow}%</span>
                )}
              </div>
            </div>

            {/* Central EMP - Fair Price */}
            <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 shadow-lg shadow-amber-950/20 relative">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-bold text-amber-300">FAIR PRICE (Central EMP)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                  Equilibrium Target
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-amber-300">
                ₹{result.emp}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                Target Return: <strong className={result.targetUpsideToEmp >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {result.targetUpsideToEmp >= 0 ? `+${result.targetUpsideToEmp}%` : `${result.targetUpsideToEmp}%`}
                </strong>
              </div>
            </div>

            {/* EMP High */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>EMP High Band</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 font-mono">
                  Sell Target
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-400">
                ₹{result.empHigh}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Max Upside: <span className="font-semibold text-slate-300">+{result.maxUpsideToEmpHigh}%</span>
              </div>
            </div>
          </div>

          {/* Visual Corridor Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200">Valuation Corridor Position</span>
              <span className="font-mono text-slate-400">
                CMP: <strong className="text-slate-100">₹{cmp}</strong>
              </span>
            </div>

            {/* The Visual Track */}
            <div className="relative pt-6 pb-2">
              <div
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-20 transition-all duration-300"
                style={{ left: `${cmpPos}%` }}
              >
                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-bold font-mono shadow-md whitespace-nowrap">
                  CMP ₹{cmp}
                </span>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-emerald-500"></div>
              </div>

              <div className="h-4 rounded-full bg-slate-950 border border-slate-700 relative overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-emerald-600/40 to-emerald-500/30" style={{ width: `${empLowPos}%` }} />
                <div className="h-full bg-gradient-to-r from-teal-500/30 to-amber-500/30" style={{ width: `${empPos - empLowPos}%` }} />
                <div className="h-full bg-gradient-to-r from-amber-500/30 to-orange-500/30" style={{ width: `${empHighPos - empPos}%` }} />
                <div className="h-full bg-gradient-to-r from-rose-500/30 to-rose-600/40 flex-1" />
              </div>

              <div className="relative h-6 text-[10px] font-mono text-slate-400 mt-1">
                <span className="absolute -translate-x-1/2 text-emerald-400" style={{ left: `${empLowPos}%` }}>
                  Low: ₹{result.empLow}
                </span>
                <span className="absolute -translate-x-1/2 text-amber-300 font-bold" style={{ left: `${empPos}%` }}>
                  EMP: ₹{result.emp}
                </span>
                <span className="absolute -translate-x-1/2 text-rose-400" style={{ left: `${empHighPos}%` }}>
                  High: ₹{result.empHigh}
                </span>
              </div>
            </div>

            {/* Step-by-Step Mathematical Transparency */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
              <div className="font-bold text-[11px] text-slate-400 uppercase font-sans mb-1 flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-indigo-400" />
                <span>Deterministic Mathematical Derivations:</span>
              </div>
              <div>&bull; Central EMP = {ttmEps} &times; {peFair} = <strong>₹{result.emp}</strong></div>
              <div>&bull; EMP Low ({confidenceMultiplier}&sigma;) = {ttmEps} &times; ({peFair} - {confidenceMultiplier} &times; {peStdDev}) = <strong>₹{result.empLow}</strong></div>
              <div>&bull; EMP High ({confidenceMultiplier}&sigma;) = {ttmEps} &times; ({peFair} + {confidenceMultiplier} &times; {peStdDev}) = <strong>₹{result.empHigh}</strong></div>
              <div>&bull; Multiple Z-Score = ({result.currentPe} - {peFair}) &divide; {peStdDev} = <strong>{result.zScore}&sigma;</strong></div>
              <div>&bull; Margin of Safety = (₹{result.emp} - ₹{cmp}) &divide; ₹{result.emp} = <strong>{result.marginOfSafetyPercent}%</strong></div>
            </div>
          </div>

          {/* Sensitivity Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-slate-200 text-sm">
                  Sensitivity Matrix: Forward EPS Growth vs EMP
                </h4>
              </div>
              <button
                onClick={() => setShowSensitivity(!showSensitivity)}
                className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                {showSensitivity ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showSensitivity && (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs text-slate-300 font-mono">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">EPS Scenario</th>
                      <th className="py-2 px-3">Projected EPS</th>
                      <th className="py-2 px-3 text-emerald-400">EMP Low</th>
                      <th className="py-2 px-3 text-amber-300">Central EMP</th>
                      <th className="py-2 px-3 text-rose-400">EMP High</th>
                      <th className="py-2 px-3">Target Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[
                      { label: '-10% (Slowdown)', factor: 0.9 },
                      { label: '0% (Stagnant)', factor: 1.0 },
                      { label: '+10% (Base Growth)', factor: 1.1 },
                      { label: '+20% (Strong Growth)', factor: 1.2 },
                      { label: '+30% (Bullish)', factor: 1.3 },
                    ].map((row) => {
                      const projEps = Number((ttmEps * row.factor).toFixed(2));
                      const projEmp = Number((projEps * peFair).toFixed(2));
                      const projLow = Number((projEps * (peFair - confidenceMultiplier * peStdDev)).toFixed(2));
                      const projHigh = Number((projEps * (peFair + confidenceMultiplier * peStdDev)).toFixed(2));
                      const projReturn = Number((((projEmp - cmp) / cmp) * 100).toFixed(1));

                      return (
                        <tr key={row.label} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-sans font-medium text-slate-200">
                            {row.label}
                          </td>
                          <td className="py-2 px-3 text-slate-400">₹{projEps}</td>
                          <td className="py-2 px-3 text-emerald-400">₹{projLow}</td>
                          <td className="py-2 px-3 font-bold text-amber-300">₹{projEmp}</td>
                          <td className="py-2 px-3 text-rose-400">₹{projHigh}</td>
                          <td className="py-2 px-3 font-bold">
                            <span className={projReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {projReturn >= 0 ? `+${projReturn}%` : `${projReturn}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
