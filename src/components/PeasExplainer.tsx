import React from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRightLeft, 
  FileSpreadsheet,
  Binary,
  Calculator,
  Sigma,
  Percent
} from 'lucide-react';

export const PeasExplainerView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/30">
            Valuation Architecture &amp; Mathematical Proofs
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Deterministic Formulaic Engine
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-2">
          Mathematical Formulation of Historical P/E Valuation Corridors
        </h1>
        <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-3xl leading-relaxed">
          How to mathematically calculate <strong>Equilibrium Fair Value (P* Equilibrium Price)</strong> and the <strong>95% Confidence P/E Multiple Valuation Corridor</strong> (&plusmn;1.96&sigma;) using 100% free public data from Screener.in and official NSE disclosures.
        </p>
      </div>

      {/* The 4 Mathematical Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: TTM EPS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold font-mono flex items-center justify-center text-sm">
              01
            </span>
            <span className="text-xs font-mono text-emerald-400">Step 1: Earnings Power</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">Trailing Twelve Months EPS (TTM EPS)</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Earnings power is the quarterly sum of net profits after taxes over the preceding 4 continuous reporting periods divided by diluted equity share capital:
          </p>
          <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-emerald-300 border border-slate-800">
            TTM EPS = (Q₁ + Q₂ + Q₃ + Q₄ Net Profit) &divide; Total Diluted Shares
          </div>
          <p className="text-[11px] text-slate-400">
            • Free source: Screener.in &gt; Profit &amp; Loss table &gt; EPS (TTM).
          </p>
        </div>

        {/* Step 2: Historical Multiples */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 font-bold font-mono flex items-center justify-center text-sm">
              02
            </span>
            <span className="text-xs font-mono text-amber-400">Step 2: Fair Multiple (&mu;)</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">Historical Median P/E Multiple</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Market perception mean-reverts over 3-year and 5-year business cycles. The fair multiple is the sample median or arithmetic mean:
          </p>
          <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-amber-300 border border-slate-800">
            &mu; = (1 / N) &sum; PEᵢ &nbsp;&nbsp;|&nbsp;&nbsp; Central EMP = TTM EPS &times; &mu;
          </div>
          <p className="text-[11px] text-slate-400">
            • Central EMP represents the gravity center of equity valuation.
          </p>
        </div>

        {/* Step 3: Valuation Volatility */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold font-mono flex items-center justify-center text-sm">
              03
            </span>
            <span className="text-xs font-mono text-indigo-400">Step 3: Dispersion (&sigma;)</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">P/E Sample Standard Deviation (&sigma;)</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Evaluates the amplitude of sentiment swings using Bessel-corrected variance:
          </p>
          <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-indigo-300 border border-slate-800">
            &sigma; = &radic; [ &sum; (PEᵢ - &mu;)&sup2; &divide; (N - 1) ]
          </div>
          <p className="text-[11px] text-slate-400">
            • High &sigma; indicates cyclical sentiment swings (e.g., Auto, Metals). Low &sigma; indicates defensive consistency (e.g., FMCG, IT).
          </p>
        </div>

        {/* Step 4: The 95% Confidence Corridor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 font-bold font-mono flex items-center justify-center text-sm">
              04
            </span>
            <span className="text-xs font-mono text-rose-400">Step 4: Corridor Bands</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">EMP High &amp; EMP Low Boundaries</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Setting k = 1.96 captures 95.44% of normal probability distribution:
          </p>
          <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-slate-200 border border-slate-800 space-y-1">
            <div className="text-rose-400">EMP High = TTM EPS &times; (&mu; + 1.96&middot;&sigma;) &rarr; Sell/Switch</div>
            <div className="text-emerald-400">EMP Low = TTM EPS &times; (&mu; - 1.96&middot;&sigma;) &rarr; Strong Buy</div>
          </div>
          <p className="text-[11px] text-slate-400">
            • When CMP &le; EMP Low, statistical reversion probability towards central EMP is ~95%+.
          </p>
        </div>
      </div>

      {/* Decision Rules Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Binary className="w-5 h-5 text-indigo-400" />
          <span>Statistical Multiple Mean-Reversion Decision Engine</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 space-y-2">
            <div className="font-bold text-emerald-400 uppercase font-mono">Zone 1: Deep Value</div>
            <div className="font-mono text-slate-200">CMP &le; EMP Low</div>
            <p className="text-slate-400">
              Multiple Z-Score &le; -1.96&sigma;. Margin of safety is maximized. Mathematical Strong Buy / Accumulate.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-800/50 space-y-2">
            <div className="font-bold text-teal-300 uppercase font-mono">Zone 2: Underpriced</div>
            <div className="font-mono text-slate-200">EMP Low &lt; CMP &lt; EMP</div>
            <p className="text-slate-400">
              Z-Score between -1.96&sigma; and 0. Risk-to-reward ratio is favorable. Accumulate.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/50 space-y-2">
            <div className="font-bold text-amber-300 uppercase font-mono">Zone 3: Fair Value</div>
            <div className="font-mono text-slate-200">EMP &le; CMP &lt; EMP High</div>
            <p className="text-slate-400">
              Z-Score between 0 and +1.96&sigma;. Stock trades within fair envelope. Hold existing positions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 space-y-2">
            <div className="font-bold text-rose-400 uppercase font-mono">Zone 4: Overpriced</div>
            <div className="font-mono text-slate-200">CMP &ge; EMP High</div>
            <p className="text-slate-400">
              Z-Score &ge; +1.96&sigma;. Asymmetric downside risk. Sell, take profits, or switch into Zone 1 equities.
            </p>
          </div>
        </div>
      </div>

      {/* Free Data Sources Reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <span>Where to Get Free Data Inputs</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          100% free and open public market disclosures. All metrics are calculated deterministically using data from these free platforms:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-slate-100 font-sans">Screener.in</div>
            <div className="text-slate-400 text-[11px]">Free Fundamental Data:</div>
            <div className="text-emerald-400">&bull; EPS (TTM)</div>
            <div className="text-emerald-400">&bull; 3Y &amp; 5Y Median P/E</div>
            <div className="text-emerald-400">&bull; Last 4 Quarters Net Profit</div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-slate-100 font-sans">Trendlyne</div>
            <div className="text-slate-400 text-[11px]">Free Valuation Envelopes:</div>
            <div className="text-indigo-400">&bull; 10th &amp; 90th P/E percentiles</div>
            <div className="text-indigo-400">&bull; P/E standard deviation</div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-slate-100 font-sans">NSE India</div>
            <div className="text-slate-400 text-[11px]">Official Primary Source:</div>
            <div className="text-amber-400">&bull; Audited Quarterly Disclosures</div>
            <div className="text-amber-400">&bull; Adjusted Daily Closing CMP</div>
          </div>
        </div>
      </div>
    </div>
  );
};
