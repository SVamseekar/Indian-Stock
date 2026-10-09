import React, { useState } from 'react';
import { StockData, PortfolioHolding } from '../types/stock';
import { calculateEmpBands } from '../utils/empCalculator';
import { 
  Layers, 
  Plus, 
  Trash2, 
  ArrowRightLeft, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Calculator
} from 'lucide-react';

interface PortfolioScannerProps {
  stocks: StockData[];
  confidenceMultiplier: number;
  onSelectStock: (stock: StockData) => void;
  onNavigateToTab: (tab: 'calculator' | 'chart') => void;
}

export const PortfolioScannerView: React.FC<PortfolioScannerProps> = ({
  stocks,
  confidenceMultiplier,
  onSelectStock,
  onNavigateToTab,
}) => {
  // Sample portfolio
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([
    {
      id: '1',
      ticker: 'TCS',
      name: 'Tata Consultancy Services Ltd',
      sector: 'Information Technology',
      quantity: 25,
      avgBuyPrice: 3400,
      cmp: 3950,
      ttmEps: 128.5,
      peFair: 29.8,
      peStdDev: 3.4,
    },
    {
      id: '2',
      ticker: 'HDFCBANK',
      name: 'HDFC Bank Ltd',
      sector: 'Banking & Financials',
      quantity: 100,
      avgBuyPrice: 1520,
      cmp: 1680,
      ttmEps: 94.6,
      peFair: 20.4,
      peStdDev: 2.6,
    },
    {
      id: '3',
      ticker: 'TITAN',
      name: 'Titan Company Ltd',
      sector: 'Consumer Discretionary',
      quantity: 30,
      avgBuyPrice: 2800,
      cmp: 3420,
      ttmEps: 40.2,
      peFair: 82.5,
      peStdDev: 8.6,
    },
    {
      id: '4',
      ticker: 'TATAMOTORS',
      name: 'Tata Motors Ltd',
      sector: 'Automobile',
      quantity: 80,
      avgBuyPrice: 620,
      cmp: 920,
      ttmEps: 76.5,
      peFair: 16.8,
      peStdDev: 3.2,
    },
    {
      id: '5',
      ticker: 'ITC',
      name: 'ITC Ltd',
      sector: 'FMCG',
      quantity: 150,
      avgBuyPrice: 420,
      cmp: 485,
      ttmEps: 16.8,
      peFair: 27.5,
      peStdDev: 2.8,
    },
  ]);

  const [selectedStockToAdd, setSelectedStockToAdd] = useState(stocks[0]?.ticker || 'RELIANCE');
  const [newQuantity, setNewQuantity] = useState<number>(50);
  const [newBuyPrice, setNewBuyPrice] = useState<number>(2500);
  const [isAddingOpen, setIsAddingOpen] = useState(false);

  // Compute portfolio valuation mathematically
  const scannedHoldings = holdings.map((h) => {
    const res = calculateEmpBands(
      h.cmp,
      h.ttmEps,
      h.peFair,
      h.peStdDev,
      confidenceMultiplier
    );

    const totalInvested = h.quantity * h.avgBuyPrice;
    const currentVal = h.quantity * h.cmp;
    const pnl = currentVal - totalInvested;
    const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    return {
      ...h,
      res,
      totalInvested,
      currentVal,
      pnl,
      pnlPercent,
      isOverpriced: h.cmp >= res.empHigh,
      isUnderpriced: h.cmp < res.emp,
      isDeepBuy: h.cmp <= res.empLow,
    };
  });

  const totalPortfolioInvested = scannedHoldings.reduce((acc, h) => acc + h.totalInvested, 0);
  const totalPortfolioCurrent = scannedHoldings.reduce((acc, h) => acc + h.currentVal, 0);
  const totalPortfolioPnl = totalPortfolioCurrent - totalPortfolioInvested;
  const totalPortfolioPnlPercent = totalPortfolioInvested > 0
    ? (totalPortfolioPnl / totalPortfolioInvested) * 100
    : 0;

  const overpricedHoldings = scannedHoldings.filter((h) => h.isOverpriced);
  const underpricedCandidates = stocks.filter((s) => s.cmp <= s.ttmEps * (s.peMean3Y - 1.96 * s.peStdDev) * 1.05);

  const handleAddStock = () => {
    const stockInfo = stocks.find((s) => s.ticker === selectedStockToAdd);
    if (!stockInfo) return;

    const newH: PortfolioHolding = {
      id: Date.now().toString(),
      ticker: stockInfo.ticker,
      name: stockInfo.name,
      sector: stockInfo.sector,
      quantity: Number(newQuantity) || 1,
      avgBuyPrice: Number(newBuyPrice) || stockInfo.cmp,
      cmp: stockInfo.cmp,
      ttmEps: stockInfo.ttmEps,
      peFair: stockInfo.peMean3Y,
      peStdDev: stockInfo.peStdDev,
    };

    setHoldings([...holdings, newH]);
    setIsAddingOpen(false);
  };

  const handleDelete = (id: string) => {
    setHoldings(holdings.filter((h) => h.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-mono border border-indigo-500/30">
                Relative Valuation Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Statistical Capital Reallocation Optimizer
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
              Cross-Reference Portfolio Against Valuation Corridors
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Cross-references each holding’s current price against historical equilibrium fair value to classify <strong>Overpriced (Trim/Switch)</strong> vs <strong>Underpriced (Accumulate/Hold)</strong>, and models reallocation alpha.
            </p>
          </div>

          <button
            onClick={() => setIsAddingOpen(!isAddingOpen)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Position</span>
          </button>
        </div>

        {/* Portfolio Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800 font-mono text-xs">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Invested</span>
            <span className="text-base font-bold text-slate-100">
              ₹{totalPortfolioInvested.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Current Value</span>
            <span className="text-base font-bold text-slate-100">
              ₹{totalPortfolioCurrent.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Unrealized P&amp;L</span>
            <span className={`text-base font-bold ${totalPortfolioPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPortfolioPnl >= 0 ? `+₹${Math.round(totalPortfolioPnl).toLocaleString()}` : `-₹${Math.abs(Math.round(totalPortfolioPnl)).toLocaleString()}`} ({totalPortfolioPnlPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Rebalance Alerts</span>
            <span className="text-base font-bold text-rose-400">
              {overpricedHoldings.length} Overpriced
            </span>
          </div>
        </div>
      </div>

      {/* Add Holding Form Drawer */}
      {isAddingOpen && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
          <h3 className="font-bold text-slate-200 text-sm">Add New Position to Scanner</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select NSE Stock</label>
              <select
                value={selectedStockToAdd}
                onChange={(e) => {
                  setSelectedStockToAdd(e.target.value);
                  const st = stocks.find((s) => s.ticker === e.target.value);
                  if (st) setNewBuyPrice(st.cmp);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200"
              >
                {stocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} - {s.name} (CMP: ₹{s.cmp})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Average Buy Price (₹)</label>
              <input
                type="number"
                min="0.1"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(Number(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAddingOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddStock}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
            >
              Save Position
            </button>
          </div>
        </div>
      )}

      {/* Switch Recommendation Banner */}
      {overpricedHoldings.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/50 border border-rose-800/60 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Mathematical Switch Pairs Identified ({overpricedHoldings.length})</span>
          </div>
          <p className="text-xs text-slate-300">
            The following holding(s) trade above EMP High. Selling here and reallocating capital into underpriced equities near EMP Low protects gains and captures mean-reversion upside:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {overpricedHoldings.map((h) => {
              const bestTarget = underpricedCandidates[0] || stocks[0];
              const capitalToReallocate = h.currentVal;
              const newShares = Math.floor(capitalToReallocate / bestTarget.cmp);

              return (
                <div key={h.id} className="p-3 bg-slate-950 rounded-xl border border-rose-800/40 text-xs font-mono space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-400 font-sans">Overpriced: {h.ticker}</span>
                    <span className="text-[10px] text-slate-400">CMP ₹{h.cmp} &gt; EMP High ₹{h.res.empHigh}</span>
                  </div>
                  <div className="text-slate-300">
                    Capital Unlocked: <strong>₹{capitalToReallocate.toLocaleString()}</strong> ({h.quantity} shares)
                  </div>
                  <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-800/40 text-emerald-300 text-[11px]">
                    Reallocate into <strong>{bestTarget.ticker}</strong> (CMP ₹{bestTarget.cmp} near EMP Low ₹{Math.round(bestTarget.ttmEps * (bestTarget.peMean3Y - 1.96 * bestTarget.peStdDev))}) &rarr; Acquire <strong>{newShares} shares</strong>. Target Return: <strong>+{Math.round(((bestTarget.ttmEps * bestTarget.peMean3Y - bestTarget.cmp) / bestTarget.cmp) * 100)}%</strong> to central EMP.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm">Portfolio Holdings Analysis ({scannedHoldings.length})</h3>
          <span className="text-xs text-slate-400 font-mono">
            Valuation Status Classification
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase font-mono">
              <tr>
                <th className="py-3 px-4">Holding / Sector</th>
                <th className="py-3 px-3">Qty &amp; Avg Price</th>
                <th className="py-3 px-3">Current CMP</th>
                <th className="py-3 px-3 text-emerald-400">EMP Low (Buy)</th>
                <th className="py-3 px-3 text-amber-300 font-bold">Fair Price (EMP)</th>
                <th className="py-3 px-3 text-rose-400">EMP High (Sell)</th>
                <th className="py-3 px-3">Current Value &amp; PnL</th>
                <th className="py-3 px-3">Signal</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {scannedHoldings.map((h) => {
                const stockData = stocks.find((s) => s.ticker === h.ticker) || {
                  ticker: h.ticker,
                  name: h.name,
                  sector: h.sector,
                  cmp: h.cmp,
                  ttmEps: h.ttmEps,
                  peMean3Y: h.peFair,
                  peMean5Y: h.peFair,
                  peStdDev: h.peStdDev,
                  peMin: 10,
                  peMax: 40,
                  roce: 20,
                  roe: 18,
                  salesGrowth3Y: 12,
                  profitGrowth3Y: 10,
                  debtToEquity: 0.1,
                  historicalQuarters: [],
                };

                return (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{h.ticker}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px] font-sans">
                        {h.sector}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      <div>{h.quantity} shares</div>
                      <div className="text-slate-500 text-[10px]">Avg: ₹{h.avgBuyPrice}</div>
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-100">
                      ₹{h.cmp}
                    </td>

                    <td className="py-3 px-3 font-bold text-emerald-400">
                      ₹{h.res.empLow}
                    </td>

                    <td className="py-3 px-3 font-bold text-amber-300">
                      ₹{h.res.emp}
                    </td>

                    <td className="py-3 px-3 font-bold text-rose-400">
                      ₹{h.res.empHigh}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-200">₹{h.currentVal.toLocaleString()}</div>
                      <div className={`text-[10px] ${h.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {h.pnl >= 0 ? `+₹${Math.round(h.pnl)}` : `-₹${Math.abs(Math.round(h.pnl))}`} ({h.pnlPercent.toFixed(1)}%)
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          h.isOverpriced
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : h.isDeepBuy
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : h.isUnderpriced
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {h.isOverpriced
                          ? 'Overpriced (Switch)'
                          : h.isDeepBuy
                          ? 'Deep Buy (Hold)'
                          : h.isUnderpriced
                          ? 'Underpriced (Hold)'
                          : 'Fair Value'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            onSelectStock(stockData);
                            onNavigateToTab('calculator');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                        >
                          Calculator
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Delete Holding"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
