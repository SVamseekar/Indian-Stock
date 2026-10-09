import React, { useState } from 'react';
import { StockData, ScreenerParsedData } from '../types/stock';
import { parseScreenerText } from '../utils/screenerParser';
import { calculateEmpBands } from '../utils/empCalculator';
import { 
  FileSpreadsheet, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  Calculator,
  ShieldCheck,
  TrendingUp,
  Percent,
  Copy
} from 'lucide-react';

interface ScreenerParserProps {
  onApplyToCalculator: (extracted: Partial<StockData>) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart') => void;
}

export const ScreenerParserView: React.FC<ScreenerParserProps> = ({
  onApplyToCalculator,
  onNavigateToTab,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [sharesCount, setSharesCount] = useState<number>(361.8); // e.g. TCS shares in Cr
  const [peFairInput, setPeFairInput] = useState<number>(29.8);
  const [peStdDevInput, setPeStdDevInput] = useState<number>(3.4);

  // Preloaded sample copy-pastes from Screener.in
  const samples = {
    tcs: `Tata Consultancy Services Ltd
Market Cap ₹ 1424560 Cr. Current Price ₹ 3950 High / Low ₹ 4592 / 3311 Stock P/E 30.7 Book Value ₹ 256 Dividend Yield 1.25 % ROCE 61.2 % ROE 50.8 % Face Value ₹ 1.00
EPS (TTM) ₹ 128.5
Net Profit 11074 11342 12040 12420`,
    reliance: `Reliance Industries Ltd
Market Cap ₹ 1854200 Cr. Current Price ₹ 2740 High / Low ₹ 3217 / 2220 Stock P/E 26.6 Book Value ₹ 1150 Dividend Yield 0.38 % ROCE 9.8 % ROE 8.9 % Face Value ₹ 10.00
EPS (TTM) ₹ 102.8
Net Profit 17506 17394 18240 18950`,
    hdfc: `HDFC Bank Ltd
Market Cap ₹ 1280000 Cr. Current Price ₹ 1680 High / Low ₹ 1794 / 1363 Stock P/E 17.8 Book Value ₹ 595 Dividend Yield 1.15 % ROCE 16.5 % ROE 15.8 % Face Value ₹ 1.00
EPS (TTM) ₹ 94.6
Net Profit 16821 16175 16372 17622`,
  };

  const parsed: ScreenerParsedData = parseScreenerText(inputText);

  // If parsed data has quarterly profits and user gave sharesCount, compute EPS
  let effectiveEps = parsed.ttmEps || 0;
  if (!effectiveEps && parsed.calculatedTtmProfit && sharesCount > 0) {
    effectiveEps = Number((parsed.calculatedTtmProfit / sharesCount).toFixed(2));
  }

  const effectiveCmp = parsed.cmp || 1000;
  const effectivePe = peFairInput || 25;
  const effectiveStd = peStdDevInput || 3;

  const result = effectiveEps > 0
    ? calculateEmpBands(effectiveCmp, effectiveEps, effectivePe, effectiveStd, 1.96)
    : null;

  const handleApply = () => {
    if (!result) return;
    onApplyToCalculator({
      ticker: parsed.ticker || (parsed.companyName ? parsed.companyName.split(' ')[0].toUpperCase() : 'SCREENER_STOCK'),
      name: parsed.companyName || 'Screener Parsed Equity',
      cmp: effectiveCmp,
      ttmEps: effectiveEps,
      peMean3Y: effectivePe,
      peStdDev: effectiveStd,
      roce: parsed.roce || 20,
      roe: parsed.roe || 18,
    });
    onNavigateToTab('calculator');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/30">
                100% Free Data Parser
              </span>
              <span className="text-xs text-slate-400 font-mono">
                No API Keys &bull; No Subscriptions
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
              Screener.in Free Raw Data &amp; Table Parser
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Copy-paste financial metrics or quarterly tables directly from <a href="https://www.screener.in" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Screener.in</a> or Excel. The engine deterministically calculates TTM EPS and exact equilibrium fair value and statistical valuation bands.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Load Demo:</span>
            <button
              onClick={() => {
                setInputText(samples.tcs);
                setPeFairInput(29.8);
                setPeStdDevInput(3.4);
                setSharesCount(361.8);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono cursor-pointer"
            >
              TCS
            </button>
            <button
              onClick={() => {
                setInputText(samples.reliance);
                setPeFairInput(26.2);
                setPeStdDevInput(3.8);
                setSharesCount(676.5);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono cursor-pointer"
            >
              Reliance
            </button>
            <button
              onClick={() => {
                setInputText(samples.hdfc);
                setPeFairInput(20.4);
                setPeStdDevInput(2.6);
                setSharesCount(760.5);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono cursor-pointer"
            >
              HDFC Bank
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Box & Parameter Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Paste Screener.in Data</span>
            </h3>
            <button
              onClick={() => setInputText('')}
              className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Clear
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
            placeholder={`Paste text copied from Screener.in here...\n\nExample:\nCurrent Price ₹ 3950\nStock P/E 30.7\nEPS (TTM) ₹ 128.5\nROCE 61.2 %\nNet Profit 11074 11342 12040 12420`}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
          />

          {/* Additional Fair P/E and StdDev Settings */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Historical Median P/E (3Y/5Y)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={peFairInput}
                  onChange={(e) => setPeFairInput(Number(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  P/E Volatility (StdDev σ)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={peStdDevInput}
                  onChange={(e) => setPeStdDevInput(Number(e.target.value) || 0.1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-slate-100"
                />
              </div>
            </div>

            {parsed.quarterlyProfits && (
              <div>
                <label className="text-slate-400 block mb-1 text-xs">
                  Equity Shares Count (Cr) (to compute TTM EPS from Net Profit)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sharesCount}
                  onChange={(e) => setSharesCount(Number(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Parsed summary tags */}
          {parsed.rawTextFound && parsed.rawTextFound.length > 0 && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-sans">
                Successfully Extracted Items:
              </span>
              {parsed.rawTextFound.map((item, idx) => (
                <div key={idx} className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Computed Valuation Corridor Results (7 cols) */}
        <div className="lg:col-span-7">
          {result && effectiveEps > 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                    Deterministic Math Calculation
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">
                    {parsed.companyName || 'Screener Stock'}
                  </h3>
                </div>

                <button
                  onClick={handleApply}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <span>Open in Full Calculator</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
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
                <div className="text-xs text-slate-300 mt-2 font-mono">
                  Z-Score: <strong>{result.zScore}</strong> | Margin of Safety: <strong>{result.marginOfSafetyPercent}%</strong> | Mean Reversion Prob: <strong>~{result.estimatedMeanReversionProbability}%</strong>
                </div>
              </div>

              {/* Mathematical Core Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-sans">Current CMP</span>
                  <span className="text-base font-bold text-slate-100">₹{result.cmp}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-sans">TTM EPS</span>
                  <span className="text-base font-bold text-indigo-400">₹{result.ttmEps}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-sans">Fair P/E</span>
                  <span className="text-base font-bold text-amber-400">{result.peFair}x</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border-2 border-amber-500/50">
                  <span className="text-amber-400 block text-[10px] font-sans font-bold">Fair Price (EMP)</span>
                  <span className="text-base font-bold text-amber-300">₹{result.emp}</span>
                </div>
              </div>

              {/* Corridor Bands */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans mb-1">
                    <span>EMP Low Band (Support)</span>
                    <span className="text-emerald-400">Buy Zone</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">₹{result.empLow}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans mb-1">
                    <span>EMP High Band (Resistance)</span>
                    <span className="text-rose-400">Sell Zone</span>
                  </div>
                  <span className="text-lg font-bold text-rose-400">₹{result.empHigh}</span>
                </div>
              </div>

              {/* Step-by-Step Mathematical Proof */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
                <div className="font-bold font-sans text-slate-200 text-xs pb-1 mb-1 border-b border-slate-800">
                  Exact Calculation Steps:
                </div>
                <div>1. Central EMP = TTM EPS ({result.ttmEps}) × Fair P/E ({result.peFair}) = <strong>₹{result.emp}</strong></div>
                <div>2. EMP Low (k=1.96) = {result.ttmEps} × ({result.peFair} - 1.96 × {result.peStdDev}) = <strong>₹{result.empLow}</strong></div>
                <div>3. EMP High (k=1.96) = {result.ttmEps} × ({result.peFair} + 1.96 × {result.peStdDev}) = <strong>₹{result.empHigh}</strong></div>
                <div>4. Current Multiple = ₹{result.cmp} ÷ ₹{result.ttmEps} = <strong>{result.currentPe}x</strong></div>
                <div>5. Multiple Z-Score = ({result.currentPe} - {result.peFair}) ÷ {result.peStdDev} = <strong>{result.zScore}σ</strong></div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
              <Calculator className="w-10 h-10 text-slate-600" />
              <div>
                <h4 className="font-bold text-slate-200 text-sm">Ready to Parse</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Paste copied text from Screener.in or click one of the quick demo buttons (TCS, Reliance, HDFC) above to see the calculation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
