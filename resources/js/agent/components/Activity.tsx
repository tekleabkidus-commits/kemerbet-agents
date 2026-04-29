import type { ActivityEvent } from '../types';

interface Props {
  events: ActivityEvent[];
}

const DOT_CLASS: Record<string, string> = {
  went_online: 'online',
  went_offline: 'offline',
  extended: 'extend',
};

const ACTION_LABEL: Record<string, string> = {
  went_online: 'Went online',
  went_offline: 'Set offline',
  extended: 'Extended time',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export default function Activity({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="activity">
      <div className="section-title">Recent Activity</div>
      <ul className="activity-list">
        {events.map((event, i) => (
          <li key={i} className="activity-item">
            <span className={`activity-dot ${DOT_CLASS[event.event_type] ?? ''}`}></span>
            <div className="activity-text">
              <div className="activity-action">{ACTION_LABEL[event.event_type] ?? event.event_type}</div>
              <div className="activity-detail">{event.description}</div>
            </div>
            <div className="activity-time">{relativeTime(event.created_at)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
