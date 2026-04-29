import type { AgentMetrics } from '../types';

interface Props {
  metrics: AgentMetrics;
}

function formatLiveTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function InfoStrip({ metrics }: Props) {
  const hasClicks = metrics.clicks_today !== null;
  const hasLiveTime = metrics.live_time_today_minutes > 0 || metrics.sessions_today > 0;

  // Hide entire strip if no data at all
  if (!hasClicks && !hasLiveTime) return null;

  return (
    <div className="info-strip" style={!hasClicks || !hasLiveTime ? { gridTemplateColumns: '1fr' } : undefined}>
      {hasClicks && (
        <div className="info-tile">
          <div className="label">Today's clicks</div>
          <div className="value">{metrics.clicks_today}</div>
          {metrics.clicks_yesterday !== null && (
            <div className="sub">
              {metrics.clicks_today! >= metrics.clicks_yesterday
                ? `↑ ${metrics.clicks_today! - metrics.clicks_yesterday} vs yesterday`
                : `↓ ${metrics.clicks_yesterday - metrics.clicks_today!} vs yesterday`}
            </div>
          )}
        </div>
      )}
      {hasLiveTime && (
        <div className="info-tile">
          <div className="label">Live time today</div>
          <div className="value">{formatLiveTime(metrics.live_time_today_minutes)}</div>
          <div className="sub">Across {metrics.sessions_today} session{metrics.sessions_today !== 1 ? 's' : ''}</div>
        </div>
      )}
    </div>
  );
}
