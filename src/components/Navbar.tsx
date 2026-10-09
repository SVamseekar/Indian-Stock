import React from 'react';
import { 
  Calculator, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  FileSpreadsheet, 
  BookOpen, 
  ShieldCheck, 
  Binary, 
  Sliders 
} from 'lucide-react';

export type TabType = 
  | 'calculator' 
  | 'chart' 
  | 'screener_parser' 
  | 'raw_modeler' 
  | 'top_ranks' 
  | 'portfolio' 
  | 'guide';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedTicker: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, selectedTicker }) => {
  const tabs = [
    { id: 'calculator', label: 'Fair Value Calculator', icon: Calculator, badge: null },
    { id: 'chart', label: 'P/E Valuation Corridor', icon: TrendingUp, badge: selectedTicker },
    { id: 'screener_parser', label: 'Financial Sheet Parser', icon: FileSpreadsheet, badge: 'Free Feed' },
    { id: 'raw_modeler', label: 'Raw EPS & σ Modeler', icon: Sliders, badge: 'Quant' },
    { id: 'top_ranks', label: 'Quantitative Screener', icon: BarChart3, badge: 'NSE' },
    { id: 'portfolio', label: 'Portfolio Rebalancer', icon: Layers, badge: 'Switches' },
    { id: 'guide', label: 'Mathematical Proofs', icon: BookOpen, badge: null },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Institutional Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base sm:text-lg bg-gradient-to-r from-amber-200 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  QUANT VALUATION TERMINAL
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
                  Statistical P/E Corridor
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Equilibrium Fair Value &amp; 95% Confidence Valuation Bands (NSE &amp; BSE)
              </p>
            </div>
          </div>

          {/* Right Status Indicators */}
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>2,000+ Equities Supported</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/50 border border-indigo-700/40 text-indigo-300">
              <Binary className="w-3.5 h-3.5 text-indigo-400" />
              <span>Institutional Quantitative Model</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-emerald-400/20 text-emerald-200'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
