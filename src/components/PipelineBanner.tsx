import { RefreshCw, Radio } from 'lucide-react';
export interface FeedState {
  busy: boolean;
  enabled: boolean;
  connected: boolean | null;
  lastAttempt: string | null;
  error: string;
  available: number;
  total: number;
}
export function PipelineBanner({
  feed,
  onRefresh,
  onToggle,
}: {
  feed: FeedState;
  onRefresh: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="feed-bar">
      <div className="feed-description">
        <Radio size={16} />
        <span>
          {feed.busy
            ? `Checking quotes (${feed.available}/${feed.total} available)…`
            : feed.connected === null
              ? 'Quotes on demand'
              : feed.connected
                ? `${feed.available}/${feed.total} quotes available`
                : 'Quotes unavailable'}
        </span>
        <span className="feed-extra">Yahoo Finance · delayed quotes</span>
      </div>
      <div className="feed-controls">
        <label>
          <input type="checkbox" checked={feed.enabled} onChange={onToggle} />
          Refresh every 60s
        </label>
        <button className="button subtle compact" disabled={feed.busy} onClick={onRefresh}>
          <RefreshCw size={15} className={feed.busy ? 'spin' : ''} />
          {feed.busy ? 'Checking' : 'Refresh quotes'}
        </button>
      </div>
      {feed.error && (
        <div className="feed-error" role="status">
          {feed.error}
        </div>
      )}
    </div>
  );
}
