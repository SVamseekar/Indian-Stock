import React, { useState } from 'react';
import { StockData } from '../types/stock';
import { projectForwardQuarters } from '../utils/empCalculator';
import { Eye, TrendingUp, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

interface PeasChartProps {
  stock: StockData;
  confidenceMultiplier: number;
  growthEstimate?: number;
}

export const PeasChart: React.FC<PeasChartProps> = ({
  stock,
  confidenceMultiplier,
  growthEstimate = 12,
}) => {
  const [showProjections, setShowProjections] = useState(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Base quarters from historical data
  const baseData = stock.historicalQuarters;

  // Forward quarters
  const lastQuarter = baseData[baseData.length - 1];
  const projectedQuarters = showProjections
    ? projectForwardQuarters(
        lastQuarter.quarter,
        lastQuarter.ttmEps,
        stock.peMean3Y,
        stock.peStdDev,
        growthEstimate,
        confidenceMultiplier,
        4
      )
    : [];

  // Combined data for plotting
  const allPoints = [
    ...baseData.map((d, i) => ({
      ...d,
      isProjected: false,
      index: i,
    })),
    ...projectedQuarters.map((p, i) => ({
      quarter: p.quarter,
      ttmEps: p.ttmEps,
      cmp: undefined as number | undefined,
      emp: p.emp,
      empHigh: p.empHigh,
      empLow: p.empLow,
      isProjected: true,
      index: baseData.length + i,
    })),
  ];

  // Calculate scaling for SVG
  const width = 800;
  const height = 400;
  const padding = { top: 30, right: 30, bottom: 50, left: 65 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min and max price values
  const allPriceValues = allPoints.flatMap((d) => [
    d.empHigh,
    d.empLow,
    d.emp,
    ...(d.cmp !== undefined ? [d.cmp] : []),
  ]);
  const minVal = Math.max(0, Math.min(...allPriceValues) * 0.85);
  const maxVal = Math.max(...allPriceValues) * 1.15;

  // Scale functions
  const getX = (index: number) => {
    return padding.left + (index / (allPoints.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + chartHeight - ((clamped - minVal) / (maxVal - minVal)) * chartHeight;
  };

  // Build corridor area polygon: EMP High forwards, then EMP Low backwards
  const highPointsStr = allPoints.map((d, i) => `${getX(i)},${getY(d.empHigh)}`).join(' ');
  const lowPointsStr = [...allPoints].reverse().map((d, i) => {
    const origIndex = allPoints.length - 1 - i;
    return `${getX(origIndex)},${getY(d.empLow)}`;
  }).join(' ');
  const corridorPolygon = `${highPointsStr} ${lowPointsStr}`;

  // Build EMP line path
  const empLinePath = allPoints.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.emp)}`).join(' ');

  // Build CMP line path (only for historical points)
  const cmpPoints = allPoints.filter((d) => d.cmp !== undefined);
  const cmpLinePath = cmpPoints.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.cmp!)}`).join(' ');

  // Hit rate calculation: how many historical quarters fell strictly within [empLow, empHigh]
  const insideCount = baseData.filter((d) => d.cmp >= d.empLow && d.cmp <= d.empHigh).length;
  const historicalAccuracy = ((insideCount / baseData.length) * 100).toFixed(1);

  // Active hover data
  const activeData = hoveredPointIndex !== null ? allPoints[hoveredPointIndex] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-100">
              {stock.name} ({stock.ticker})
            </h3>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {stock.sector}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical 95% Valuation Corridor (Quarterly TTM EPS × Fair P/E Bands)
          </p>
        </div>

        {/* Stats & Toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-mono">Corridor Hit Rate:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{historicalAccuracy}%</span>
            <span className="text-[10px] text-emerald-500/80">({insideCount}/{baseData.length} Qtrs)</span>
          </div>

          <button
            onClick={() => setShowProjections(!showProjections)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              showProjections
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showProjections ? 'Projections On' : 'Show +4Q Projections'}</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 py-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-4 h-2.5 rounded bg-indigo-500/30 border border-indigo-400/50"></span>
          <span>95% Valuation Corridor (Lower to Upper P/E Bands)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-amber-400 border-dashed"></span>
          <span className="font-semibold text-amber-300">Equilibrium Fair Value (P* Mean)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-emerald-400"></span>
          <span>Current Market Price (CMP)</span>
        </div>
        {showProjections && (
          <div className="flex items-center gap-2 text-indigo-400">
            <span className="w-4 h-0.5 border-t border-dashed border-indigo-400"></span>
            <span>Estimated +{growthEstimate}% Growth Band</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[640px] text-slate-500"
          onMouseLeave={() => setHoveredPointIndex(null)}
        >
          <defs>
            {/* Corridor Gradient */}
            <linearGradient id="corridorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.25" />
            </linearGradient>

            {/* Projection Gradient */}
            <linearGradient id="projectionGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal price levels) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const price = minVal + (maxVal - minVal) * (1 - ratio);
            const y = padding.top + ratio * chartHeight;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#94a3b8"
                  fontFamily="monospace"
                >
                  ₹{Math.round(price)}
                </text>
              </g>
            );
          })}

          {/* Projection Zone divider */}
          {showProjections && (
            <line
              x1={getX(baseData.length - 1)}
              y1={padding.top}
              x2={getX(baseData.length - 1)}
              y2={padding.top + chartHeight}
              stroke="#6366f1"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          )}

          {/* 95% Valuation Corridor Shaded Polygon */}
          <polygon
            points={corridorPolygon}
            fill="url(#corridorGrad)"
            stroke="#6366f1"
            strokeWidth="1"
            strokeOpacity="0.5"
          />

          {/* Central EMP Line */}
          <path
            d={empLinePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.2"
            strokeDasharray="5 3"
          />

          {/* Historical CMP Line */}
          <path
            d={cmpLinePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Quarter Labels on X-axis & Interactive dots */}
          {allPoints.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredPointIndex === i;

            return (
              <g key={d.quarter}>
                {/* X-axis tick & label */}
                <text
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill={d.isProjected ? '#a5b4fc' : '#94a3b8'}
                  fontWeight={d.isProjected ? 'bold' : 'normal'}
                >
                  {d.quarter}
                </text>

                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* EMP dot */}
                <circle
                  cx={x}
                  cy={getY(d.emp)}
                  r={isHovered ? 5 : 3.5}
                  fill="#f59e0b"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                />

                {/* EMP High dot */}
                <circle
                  cx={x}
                  cy={getY(d.empHigh)}
                  r={isHovered ? 4 : 2.5}
                  fill="#ef4444"
                  opacity="0.8"
                />

                {/* EMP Low dot */}
                <circle
                  cx={x}
                  cy={getY(d.empLow)}
                  r={isHovered ? 4 : 2.5}
                  fill="#10b981"
                  opacity="0.8"
                />

                {/* CMP dot (only historical) */}
                {d.cmp !== undefined && (
                  <circle
                    cx={x}
                    cy={getY(d.cmp)}
                    r={isHovered ? 6 : 4.5}
                    fill="#10b981"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                )}

                {/* Invisible hover trigger area */}
                <rect
                  x={x - chartWidth / (allPoints.length * 2)}
                  y={padding.top}
                  width={chartWidth / allPoints.length}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPointIndex(i)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activeData && (
          <div
            className="absolute z-10 bg-slate-800/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs pointer-events-none transition-all duration-100 backdrop-blur"
            style={{
              left: `${Math.min(75, Math.max(10, (hoveredPointIndex! / (allPoints.length - 1)) * 100))}%`,
              top: '15px',
            }}
          >
            <div className="flex items-center justify-between gap-4 font-bold border-b border-slate-700 pb-1.5 mb-1.5">
              <span className="text-slate-100">{activeData.quarter}</span>
              {activeData.isProjected ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                  Projected
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
                  Actual
                </span>
              )}
            </div>

            <div className="space-y-1 font-mono">
              <div className="flex justify-between gap-4 text-slate-300">
                <span className="text-slate-400">TTM EPS:</span>
                <span className="font-semibold text-slate-200">₹{activeData.ttmEps}</span>
              </div>
              {activeData.cmp !== undefined && (
                <div className="flex justify-between gap-4 text-emerald-400">
                  <span>Actual CMP:</span>
                  <span className="font-bold">₹{activeData.cmp}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 text-amber-400">
                <span>Central EMP:</span>
                <span className="font-bold">₹{activeData.emp}</span>
              </div>
              <div className="flex justify-between gap-4 text-rose-400">
                <span>EMP High:</span>
                <span>₹{activeData.empHigh}</span>
              </div>
              <div className="flex justify-between gap-4 text-emerald-400">
                <span>EMP Low:</span>
                <span>₹{activeData.empLow}</span>
              </div>

              {activeData.cmp !== undefined && (
                <div className="pt-1 mt-1 border-t border-slate-700/60 flex justify-between gap-4 text-[11px]">
                  <span className="text-slate-400">Corridor Status:</span>
                  <span
                    className={`font-semibold ${
                      activeData.cmp <= activeData.empLow
                        ? 'text-emerald-400'
                        : activeData.cmp >= activeData.empHigh
                        ? 'text-rose-400'
                        : activeData.cmp < activeData.emp
                        ? 'text-teal-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {activeData.cmp <= activeData.empLow
                      ? 'Deep Buy'
                      : activeData.cmp >= activeData.empHigh
                      ? 'Overpriced'
                      : activeData.cmp < activeData.emp
                      ? 'Underpriced'
                      : 'Fair'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Insights */}
      <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Hover over any quarter point to see quarterly EPS and exact valuation corridor boundaries.
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Historical 3Y P/E Mean: <strong className="text-slate-200">{stock.peMean3Y}x</strong> | StdDev: <strong className="text-slate-200">±{stock.peStdDev}x</strong>
        </div>
      </div>
    </div>
  );
};
