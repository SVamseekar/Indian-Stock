import {
  Calculator,
  ChartNoAxesCombined,
  FileInput,
  Sigma,
  ListFilter,
  BriefcaseBusiness,
  BookOpen,
  ChartCandlestick,
} from 'lucide-react';
export type TabType =
  'calculator' | 'chart' | 'screener_parser' | 'raw_modeler' | 'top_ranks' | 'portfolio' | 'guide';
const tabs = [
  ['calculator', 'Fair value', Calculator],
  ['chart', 'Price & scenarios', ChartNoAxesCombined],
  ['screener_parser', 'Import financials', FileInput],
  ['raw_modeler', 'Build from earnings', Sigma],
  ['top_ranks', 'Compare stocks', ListFilter],
  ['portfolio', 'My portfolio', BriefcaseBusiness],
  ['guide', 'How it works', BookOpen],
] as const;
export function Navbar({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedTicker?: string;
}) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#calculator" onClick={() => setActiveTab('calculator')}>
        <span className="brand-mark">
          <ChartCandlestick size={24} />
        </span>
        <span>
          Indian Stock<small>Fair value workspace</small>
        </span>
      </a>
      <nav aria-label="Main navigation">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            aria-current={activeTab === id ? 'page' : undefined}
            className={activeTab === id ? 'active' : ''}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <span className="badge blue">NSE / BSE</span>
        <p>Understand the assumptions behind every value.</p>
        <a href="https://www.youtube.com/watch?v=CboJkEiyR08" target="_blank" rel="noreferrer">
          Reference video
        </a>
      </div>
    </aside>
  );
}
