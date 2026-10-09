import { useState, useEffect, useRef, useCallback } from 'react';
import type { StockData, MarketQuote } from './types/stock';
import { DEFAULT_STOCKS } from './data/defaultStocks';
import { quoteSymbolFor, quoteBatches } from './utils/symbols';
import { createManualStock, readManualStocks } from './utils/workspace';
import { Navbar, type TabType } from './components/Navbar';
import { PipelineBanner, type FeedState } from './components/PipelineBanner';
import { CalculatorView } from './components/Calculator';
import { PeasChart } from './components/PeasChart';
import { ScreenerParserView } from './components/ScreenerParser';
import { RawDataCalculatorView } from './components/RawDataCalculator';
import { TopRanksView } from './components/TopRanks';
import { PortfolioScannerView } from './components/PortfolioScanner';
import { PeasExplainerView } from './components/PeasExplainer';
import { Notice, SourceNote } from './components/shared';

const pages: TabType[] = [
  'calculator',
  'chart',
  'screener_parser',
  'raw_modeler',
  'top_ranks',
  'portfolio',
  'guide',
];
const initialPage = () =>
  pages.includes(location.hash.slice(1) as TabType)
    ? (location.hash.slice(1) as TabType)
    : 'calculator';
export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(initialPage);
  const [stocks, setStocks] = useState<StockData[]>(() => {
    const manual = readManualStocks();
    return [
      ...manual,
      ...DEFAULT_STOCKS.filter((s) => !manual.some((m) => m.ticker === s.ticker)).map((s) => ({
        ...s,
        sourceKind: 'demo' as const,
      })),
    ];
  });
  const [selectedTicker, setSelectedTicker] = useState(stocks[0].ticker);
  const selectedStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
  const [confidenceMultiplier, setConfidenceMultiplier] = useState(1.96);
  const [feed, setFeed] = useState<FeedState>({
    busy: false,
    enabled: false,
    connected: null,
    lastAttempt: null,
    error: '',
    available: 0,
    total: 0,
  });
  const [storageError, setStorageError] = useState('');
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;
  const inFlight = useRef<AbortController | null>(null);
  const navigate = useCallback((tab: TabType) => {
    setActiveTab(tab);
    location.hash = tab;
  }, []);
  useEffect(() => {
    const onHash = () => setActiveTab(initialPage());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        'indian-stock-models-v1',
        JSON.stringify(stocks.filter((s) => s.sourceKind === 'manual')),
      );
    } catch {
      setStorageError('Browser storage is unavailable. Export your model to keep a copy.');
    }
  }, [stocks]);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const batches = quoteBatches(stocksRef.current);
    if (!batches.length) {
      setFeed((f) => ({ ...f, error: 'No exchange symbols are attached to these custom models.' }));
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    const total = batches.reduce((sum, batch) => sum + batch.length, 0);
    const completed = new Set<string>();
    let available = 0;
    setFeed((f) => ({ ...f, busy: true, error: '', available: 0, total }));
    try {
      for (const batch of batches) {
        const response = await fetch(
          `/api/live-quotes?tickers=${encodeURIComponent(batch.join(','))}`,
          { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) },
        );
        if (!response.ok) throw new Error(`Quote request failed (${response.status}).`);
        const data = await response.json();
        if (!data.success || !data.quotes || typeof data.availableCount !== 'number')
          throw new Error('The server returned incomplete quote data.');
        if (controller.signal.aborted) return;
        available += data.availableCount;
        batch.forEach((symbol) => completed.add(symbol));
        setStocks((previous) =>
          previous.map((stock) => {
            const symbol = quoteSymbolFor(stock);
            const quote: MarketQuote | undefined = symbol ? data.quotes[symbol] : undefined;
            return quote ? { ...stock, quote } : stock;
          }),
        );
        setFeed((f) => ({
          ...f,
          connected: available > 0,
          available,
          total,
          lastAttempt: new Date().toISOString(),
        }));
      }
      setFeed((f) => ({
        ...f,
        error:
          available === 0
            ? 'The provider could not supply current quotes. Saved model prices have been kept.'
            : available < total
              ? 'Some quotes are stale or unavailable. Check each quote before using it.'
              : '',
      }));
    } catch (e) {
      if (inFlight.current === controller) {
        setStocks((previous) =>
          previous.map((s) =>
            s.quote && !completed.has(quoteSymbolFor(s) || '')
              ? { ...s, quote: { ...s.quote, status: 'stale' } }
              : s,
          ),
        );
        setFeed((f) => ({
          ...f,
          connected: available > 0,
          available,
          total,
          lastAttempt: new Date().toISOString(),
          error:
            e instanceof Error
              ? `${e.message} Saved prices have been kept.`
              : 'Quotes are unavailable.',
        }));
      }
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setFeed((f) => ({ ...f, busy: false }));
      }
    }
  }, []);
  useEffect(() => {
    if (!feed.enabled) return;
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 60_000);
    return () => clearInterval(timer);
  }, [feed.enabled, refresh]);
  useEffect(
    () => () => {
      inFlight.current?.abort();
      inFlight.current = null;
    },
    [],
  );
  const select = (stock: StockData) => {
    setStocks((prev) =>
      prev.some((s) => s.ticker === stock.ticker)
        ? prev.map((s) => (s.ticker === stock.ticker ? stock : s))
        : [stock, ...prev],
    );
    setSelectedTicker(stock.ticker);
  };
  const removeModel = (ticker: string) => {
    const original = DEFAULT_STOCKS.find((s) => s.ticker === ticker);
    setStocks((prev) => [
      ...prev.filter((s) => s.ticker !== ticker),
      ...(original ? [{ ...original, sourceKind: 'demo' as const }] : []),
    ]);
    setSelectedTicker(original?.ticker || 'TCS');
  };
  const apply = (data: Partial<StockData>) => {
    select(createManualStock(data));
    navigate('calculator');
  };
  const shared = { stocks, confidenceMultiplier, onSelectStock: select, onNavigateToTab: navigate };
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar activeTab={activeTab} setActiveTab={navigate} />
      <div className="workspace">
        <header className="workspace-header">
          <span>Equity research</span>
          <span className="header-note">Transparent inputs. Reproducible calculations.</span>
        </header>
        <PipelineBanner
          feed={feed}
          onRefresh={refresh}
          onToggle={() => setFeed((f) => ({ ...f, enabled: !f.enabled }))}
        />
        <main id="main-content" tabIndex={-1}>
          {storageError && <Notice>{storageError}</Notice>}
          {activeTab === 'calculator' && (
            <CalculatorView
              {...shared}
              selectedStock={selectedStock}
              onAddToPortfolio={() => navigate('portfolio')}
              setConfidenceMultiplier={setConfidenceMultiplier}
              onRemoveModel={removeModel}
            />
          )}
          {activeTab === 'chart' && (
            <>
              <div className="page-title">
                <h1>Price history & scenarios</h1>
                <p>Explore how earnings assumptions change the model value.</p>
              </div>
              <label className="stock-picker">
                Stock
                <select
                  value={selectedStock.ticker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                >
                  {stocks.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <SourceNote stock={selectedStock} />
              <PeasChart stock={selectedStock} confidenceMultiplier={confidenceMultiplier} />
            </>
          )}
          {activeTab === 'screener_parser' && (
            <ScreenerParserView onApplyToCalculator={apply} onNavigateToTab={navigate} />
          )}
          {activeTab === 'raw_modeler' && (
            <RawDataCalculatorView onApplyToMainCalculator={apply} onNavigateToTab={navigate} />
          )}
          {activeTab === 'top_ranks' && <TopRanksView {...shared} />}
          {activeTab === 'portfolio' && (
            <PortfolioScannerView {...shared} selectedTicker={selectedStock.ticker} />
          )}
          {activeTab === 'guide' && <PeasExplainerView />}
        </main>
        <footer>
          P/E values are model estimates. Check source filings, financial periods and corporate
          actions before relying on them.
          <a href="#guide" onClick={() => navigate('guide')}>
            Read the methodology
          </a>
        </footer>
      </div>
    </div>
  );
}
