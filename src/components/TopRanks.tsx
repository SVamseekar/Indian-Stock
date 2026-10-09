import React, { useState } from 'react';
import { StockData } from '../types/stock';
import { calculateEmpBands } from '../utils/empCalculator';
import { 
  BarChart3, 
  ArrowUpDown, 
  ShieldCheck, 
  TrendingUp, 
  Filter, 
  ChevronRight,
  TrendingDown,
  Calculator
} from 'lucide-react';

interface TopRanksProps {
  stocks: StockData[];
  confidenceMultiplier: number;
  onSelectStock: (stock: StockData) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart') => void;
}

export const TopRanksView: React.FC<TopRanksProps> = ({
  stocks,
  confidenceMultiplier,
  onSelectStock,
  onNavigateToTab,
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'NEAR_EMP_LOW' | 'UNDERPRICED'>('NEAR_EMP_LOW');
  const [sortBy, setSortBy] = useState<'discountToLow' | 'upside' | 'roce' | 'cmp'>('discountToLow');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Compute calculated metrics for all stocks mathematically
  const rankedStocks = stocks.map((stk) => {
    const res = calculateEmpBands(
      stk.cmp,
      stk.ttmEps,
      stk.peMean3Y,
      stk.peStdDev,
      confidenceMultiplier
    );

    // Distance to EMP Low: negative means CMP is BELOW EMP Low (deepest discount)
    const distanceToLow = ((stk.cmp - res.empLow) / res.empLow) * 100;

    return {
      ...stk,
      res,
      distanceToLow,
      upsideToEmp: res.targetUpsideToEmp,
    };
  });

  // Extract unique sectors
  const sectors = ['ALL', ...Array.from(new Set(stocks.map((s) => s.sector)))];

  // Filter
  const filtered = rankedStocks.filter((s) => {
    if (selectedSector !== 'ALL' && s.sector !== selectedSector) return false;
    if (filterMode === 'NEAR_EMP_LOW') return s.distanceToLow <= 15; // Within 15% of EMP Low or below
    if (filterMode === 'UNDERPRICED') return s.cmp < s.res.emp;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'discountToLow') {
      diff = a.distanceToLow - b.distanceToLow; // Lowest distanceToLow first
    } else if (sortBy === 'upside') {
      diff = b.upsideToEmp - a.upsideToEmp; // Highest upside first
    } else if (sortBy === 'roce') {
      diff = b.roce - a.roce;
    } else if (sortBy === 'cmp') {
      diff = a.cmp - b.cmp;
    }

    return sortDirection === 'asc' ? diff : -diff;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/30">
                Quantitative Screener
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Statistical Multiple Reversion Model
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
              Top Ranked Equities: Lower Valuation Corridor (-1.96σ Support)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Algorithmic rankings of Indian equities currently trading at or near their lower valuation boundaries (-1.96σ Support Band), providing maximum statistical margin of safety and ~95% mean-reversion probability.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Screened Equities</div>
              <div className="text-sm font-bold text-slate-100 font-mono">
                {sorted.length} / {stocks.length} Matches
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Criteria:</span>
            </span>
            <button
              onClick={() => setFilterMode('NEAR_EMP_LOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                filterMode === 'NEAR_EMP_LOW'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Near or Below EMP Low
            </button>
            <button
              onClick={() => setFilterMode('UNDERPRICED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                filterMode === 'UNDERPRICED'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Underpriced (&lt; EMP)
            </button>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                filterMode === 'ALL'
                  ? 'bg-slate-700 text-slate-200 border border-slate-600'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Show All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              aria-label="Filter by sector"
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'ALL' ? 'All Sectors' : sec}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort stocks by"
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="discountToLow">Rank: Closest to EMP Low</option>
              <option value="upside">Rank: Highest Target Upside</option>
              <option value="roce">Rank: Highest RoCE</option>
            </select>

            <button
              onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
              title="Toggle Sort Direction"
              aria-label="Toggle sort direction"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Screened Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase font-mono">
              <tr>
                <th className="py-3 px-4">Rank / Stock</th>
                <th className="py-3 px-3">Current CMP</th>
                <th className="py-3 px-3 text-emerald-400">EMP Low (Buy)</th>
                <th className="py-3 px-3 text-amber-300 font-bold">Fair Price (EMP)</th>
                <th className="py-3 px-3">Distance to Low</th>
                <th className="py-3 px-3">Target Upside</th>
                <th className="py-3 px-3">RoCE / Growth</th>
                <th className="py-3 px-3">Signal</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    No stocks match the selected criteria. Try changing the filter to &apos;All Underpriced&apos;.
                  </td>
                </tr>
              ) : (
                sorted.map((item, idx) => {
                  const isBelowLow = item.cmp <= item.res.empLow;

                  return (
                    <tr
                      key={item.ticker}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        onSelectStock(item);
                        onNavigateToTab('calculator');
                      }}
                    >
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center text-[11px] font-bold font-mono">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{item.ticker}</span>
                              {isBelowLow && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono border border-emerald-500/30">
                                  Deep Buy
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-sans truncate max-w-[150px]">
                              {item.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-200">
                        ₹{item.cmp}
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-400">
                        ₹{item.res.empLow}
                      </td>

                      <td className="py-3 px-3 font-bold text-amber-300">
                        ₹{item.res.emp}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            item.distanceToLow <= 0
                              ? 'text-emerald-400'
                              : item.distanceToLow <= 10
                              ? 'text-teal-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.distanceToLow <= 0
                            ? `${item.distanceToLow.toFixed(1)}% (Below)`
                            : `+${item.distanceToLow.toFixed(1)}%`}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-400">
                        +{item.upsideToEmp}%
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div>RoCE: <strong className="text-slate-200">{item.roce}%</strong></div>
                        <div className="text-slate-400">3Y Sales: +{item.salesGrowth3Y}%</div>
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.res.status === 'DEEPLY_UNDERPRICED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : item.res.status === 'UNDERPRICED'
                              ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.res.status === 'DEEPLY_UNDERPRICED'
                            ? 'Strong Buy'
                            : item.res.status === 'UNDERPRICED'
                            ? 'Accumulate'
                            : 'Fair Value'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              onSelectStock(item);
                              onNavigateToTab('calculator');
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            title="Open in Calculator"
                          >
                            <Calculator className="w-4 h-4 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => {
                              onSelectStock(item);
                              onNavigateToTab('chart');
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            title="View Valuation Corridor Chart"
                          >
                            <BarChart3 className="w-4 h-4 text-indigo-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
