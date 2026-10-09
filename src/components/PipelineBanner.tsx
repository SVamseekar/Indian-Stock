import React, { useState } from 'react';
import { StockData, PipelineStatus, PipelineAlert } from '../types/stock';
import { 
  Activity, 
  RefreshCw, 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';

interface PipelineBannerProps {
  stocks: StockData[];
  pipelineStatus: PipelineStatus;
  alerts: PipelineAlert[];
  onTriggerSync: () => void;
  onToggleAutoSync: () => void;
  onChangeInterval: (seconds: number) => void;
  onSelectStock: (stock: StockData) => void;
}

export const PipelineBanner: React.FC<PipelineBannerProps> = ({
  stocks,
  pipelineStatus,
  alerts,
  onTriggerSync,
  onToggleAutoSync,
  onChangeInterval,
  onSelectStock,
}) => {
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    await onTriggerSync();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 shadow-lg">
      {/* Top Pipeline Status Line */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Status Pulse */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {pipelineStatus.isAutoSyncing ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              )}
            </span>
            <span className="font-bold font-mono tracking-tight text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
              <span>Automatic Market Pipeline:</span>
              <span className={pipelineStatus.isAutoSyncing ? 'text-emerald-400' : 'text-amber-400'}>
                {pipelineStatus.isAutoSyncing ? 'ACTIVE (STREAMING)' : 'PAUSED'}
              </span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-slate-400 font-mono text-[11px] border-l border-slate-800 pl-3">
            <span>Equities: <strong className="text-slate-200">{stocks.length} Monitored</strong></span>
            <span>&bull;</span>
            <span>Cycle: <strong className="text-slate-200">#{pipelineStatus.syncCount}</strong></span>
            {pipelineStatus.lastSyncTime && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Synced: <strong className="text-slate-300">{pipelineStatus.lastSyncTime}</strong></span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Pipeline Controls */}
        <div className="flex items-center gap-2">
          {/* Interval Selector */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-500">Interval:</span>
            {[10, 15, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => onChangeInterval(sec)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  pipelineStatus.intervalSeconds === sec
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Toggle Pause / Resume */}
          <button
            onClick={onToggleAutoSync}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer border transition-colors ${
              pipelineStatus.isAutoSyncing
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {pipelineStatus.isAutoSyncing ? (
              <>
                <Pause className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Resume</span>
              </>
            )}
          </button>

          {/* Instant Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-1 cursor-pointer transition-all shadow-sm shadow-emerald-900/50"
            title="Execute Pipeline Now"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          {/* Pipeline Signals Alert Bell */}
          <button
            onClick={() => setShowAlertsModal(!showAlertsModal)}
            className="relative px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Alerts</span>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[9px]">
                {alerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Scrolling Ticker Tape */}
      <div className="bg-slate-950/90 border-t border-slate-800/80 overflow-x-auto scrollbar-none py-2 px-4 sm:px-6">
        <div className="flex items-center gap-3 text-xs whitespace-nowrap min-w-max">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 pr-2 border-r border-slate-800 shrink-0">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>LIVE FEED:</span>
          </div>

          {stocks.map((stk) => {
            const fair = Math.round(stk.ttmEps * stk.peMean3Y);
            const isUnderpriced = stk.cmp < fair;
            const changePercent = stk.changePercent || 0;

            return (
              <button
                key={stk.ticker}
                onClick={() => onSelectStock(stk)}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors text-left"
              >
                <span className="font-bold font-mono text-slate-200">{stk.ticker}</span>
                <span className="font-mono text-slate-100 font-semibold">₹{stk.cmp}</span>

                <span
                  className={`font-mono text-[10px] flex items-center ${
                    changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(1)}%
                </span>

                <span className="text-[10px] font-mono text-slate-400 border-l border-slate-800 pl-1.5">
                  Fair: <strong className="text-amber-300">₹{fair}</strong>
                </span>

                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-sans font-semibold ${
                    isUnderpriced
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {isUnderpriced ? 'UNDERPRICED' : 'OVERPRICED'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts Drawer Modal */}
      {showAlertsModal && (
        <div className="border-t border-slate-800 bg-slate-950 p-4 animate-in fade-in duration-150">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-slate-200 text-xs sm:text-sm font-mono">
                  Automated Pipeline Boundary Signals ({alerts.length})
                </h4>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 font-mono">
                No boundary violations detected. All monitored equities are trading within their normal statistical corridor bands.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 max-h-56 overflow-y-auto">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className={`p-2.5 rounded-xl border text-xs font-mono space-y-1 ${
                      al.type === 'BUY_ZONE_ENTERED'
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold font-sans text-slate-100">{al.ticker}</span>
                      <span className="text-[10px] text-slate-400">{al.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">{al.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
