import React, { useState } from 'react';
import { StockData } from '../types/stock';
import { 
  calculateMean, 
  calculateSampleStdDev, 
  calculateTtmEpsFromQuarters, 
  calculateEmpBands 
} from '../utils/empCalculator';
import { 
  Calculator, 
  Sliders, 
  TrendingUp, 
  Percent, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface RawDataCalculatorProps {
  onApplyToMainCalculator: (data: Partial<StockData>) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart') => void;
}

export const RawDataCalculatorView: React.FC<RawDataCalculatorProps> = ({
  onApplyToMainCalculator,
  onNavigateToTab,
}) => {
  // 1. TTM EPS Builder: 4 quarters net profit (₹ Cr) and Shares count (Cr)
  const [q1Profit, setQ1Profit] = useState<number>(11074);
  const [q2Profit, setQ2Profit] = useState<number>(11342);
  const [q3Profit, setQ3Profit] = useState<number>(12040);
  const [q4Profit, setQ4Profit] = useState<number>(12420);
  const [sharesCountCr, setSharesCountCr] = useState<number>(361.8);
  const [cmp, setCmp] = useState<number>(3950);

  // 2. Historical PE Multiple Series (comma-separated or list)
  const [peSeriesText, setPeSeriesText] = useState<string>('26.4, 28.5, 30.2, 32.1, 29.8, 31.4, 27.9, 33.5');

  // Compute TTM EPS
  const { ttmProfitCr, ttmEps } = calculateTtmEpsFromQuarters(
    q1Profit,
    q2Profit,
    q3Profit,
    q4Profit,
    sharesCountCr
  );

  // Compute PE Mean and StdDev from user's series
  const peNumbers = peSeriesText
    .split(/[,\s]+/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n) && n > 0);

  const calculatedPeMean = calculateMean(peNumbers) || 29.8;
  const calculatedPeStdDev = calculateSampleStdDev(peNumbers) || 3.4;

  // Compute Statistical Valuation Corridor Bands
  const result = calculateEmpBands(cmp, ttmEps, calculatedPeMean, calculatedPeStdDev, 1.96);

  const handleApply = () => {
    onApplyToMainCalculator({
      cmp,
      ttmEps,
      peMean3Y: calculatedPeMean,
      peStdDev: calculatedPeStdDev,
    });
    onNavigateToTab('calculator');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/30">
            Raw Mathematical Engine
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Bessel’s StdDev &bull; Sum of 4 Quarters
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
          Build Valuation Corridor Model from Raw Quarterly Filings
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
          Enter raw quarterly Net Profit (₹ Cr) and historical quarterly P/E series from NSE disclosures. The engine computes TTM EPS, sample standard deviation ($s$), and the exact 95% statistical valuation confidence corridor.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Section 1: TTM EPS Engine */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>1. TTM Net Profit &amp; EPS Calculator</span>
              </h3>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                TTM EPS: ₹{ttmEps}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Q1 Net Profit (₹ Cr)</label>
                <input
                  type="number"
                  value={q1Profit}
                  onChange={(e) => setQ1Profit(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Q2 Net Profit (₹ Cr)</label>
                <input
                  type="number"
                  value={q2Profit}
                  onChange={(e) => setQ2Profit(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Q3 Net Profit (₹ Cr)</label>
                <input
                  type="number"
                  value={q3Profit}
                  onChange={(e) => setQ3Profit(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Q4 Net Profit (₹ Cr)</label>
                <input
                  type="number"
                  value={q4Profit}
                  onChange={(e) => setQ4Profit(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800">
              <div>
                <label className="text-slate-400 block mb-1">Total Equity Shares (Cr)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sharesCountCr}
                  onChange={(e) => setSharesCountCr(Number(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Current Stock CMP (₹)</label>
                <input
                  type="number"
                  value={cmp}
                  onChange={(e) => setCmp(Number(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
              Formula: (₹{q1Profit} + ₹{q2Profit} + ₹{q3Profit} + ₹{q4Profit}) = ₹{ttmProfitCr} Cr &divide; {sharesCountCr} Cr Shares = <strong>₹{ttmEps} EPS</strong>
            </div>
          </div>

          {/* Section 2: P/E Dispersion & Standard Deviation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>2. Historical P/E Multiple Series (&sigma; Engine)</span>
              </h3>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {peNumbers.length} Points
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Enter historical P/E values separated by commas:
              </label>
              <textarea
                value={peSeriesText}
                onChange={(e) => setPeSeriesText(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] font-sans">Sample Mean P/E (&mu;)</span>
                <span className="text-base font-bold text-amber-300">{calculatedPeMean}x</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] font-sans">Std Deviation (&sigma;)</span>
                <span className="text-base font-bold text-slate-200">&plusmn;{calculatedPeStdDev}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output: Quantitative Valuation Corridor Solution (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">
                Computed Valuation Corridor
              </h3>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Apply to Live Engine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Decision Status */}
            <div
              className={`p-4 rounded-xl border ${
                result.status === 'DEEPLY_UNDERPRICED'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : result.status === 'UNDERPRICED'
                  ? 'bg-teal-950/40 border-teal-800/60 text-teal-300'
                  : result.status === 'FAIR_VALUE'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm">
                <span>Valuation Corridor Signal:</span>
                <span className="font-mono">{result.statusLabel}</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                At CMP of ₹{cmp}, stock is trading at <strong>{result.currentPe}x</strong> earnings (Z-Score: <strong>{result.zScore}&sigma;</strong>).
              </p>
            </div>

            {/* The 3 Core Output Bands */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-emerald-400 block font-sans">EMP Low (Buy)</span>
                <span className="text-lg font-bold text-emerald-400">₹{result.empLow}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border-2 border-amber-500/40">
                <span className="text-[10px] text-amber-300 block font-sans font-bold">Central EMP</span>
                <span className="text-lg font-bold text-amber-300">₹{result.emp}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-rose-400 block font-sans">EMP High (Sell)</span>
                <span className="text-lg font-bold text-rose-400">₹{result.empHigh}</span>
              </div>
            </div>

            {/* Statistical Details */}
            <div className="space-y-2 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-400 font-sans font-bold text-xs pb-1 border-b border-slate-800">
                Statistical Reversion Metrics:
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Upside to EMP:</span>
                <span className="font-bold text-emerald-400">+{result.targetUpsideToEmp}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Downside to EMP Low:</span>
                <span className="text-rose-400">{result.downsideRiskToEmpLow}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Margin of Safety:</span>
                <span className="text-slate-200">{result.marginOfSafetyPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk/Reward Ratio:</span>
                <span className="text-slate-200">{result.riskRewardRatio}:1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Theoretical Corridor Hit Rate:</span>
                <span className="text-emerald-400 font-bold">~{result.historicalHitRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
