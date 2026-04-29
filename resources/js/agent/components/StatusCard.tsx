import type { AgentState } from '../types';
import useCountdown from '../useCountdown';

interface Props {
  state: AgentState;
  onGoOffline: () => void;
  onTimerExpired: () => void;
  isProcessing: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function StatusCard({ state, onGoOffline, onTimerExpired, isProcessing }: Props) {
  const isLive = state.status.is_live;

  const { hours, minutes, seconds, progressPercent } = useCountdown(
    state.status.live_until,
    state.status.total_duration_minutes,
    onTimerExpired,
  );

  if (isLive) {
    return (
      <div className="status-card live">
        <div className="status-label">
          <span className="status-dot"></span>
          You are live
        </div>
        <div className="status-headline">Online</div>
        <div className="status-sub">Players can see your card and message you.</div>

        <div className="countdown">
          <span className="countdown-num">{pad(hours)}</span>
          <span className="countdown-unit">h</span>
          <span className="countdown-num">{pad(minutes)}</span>
          <span className="countdown-unit">m</span>
          <span className="countdown-num">{pad(seconds)}</span>
          <span className="countdown-unit">s</span>
        </div>

        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="status-actions">
          <button
            className="action-btn extend"
            disabled={isProcessing}
            onClick={() => {
              document.getElementById('goLiveSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            ⚡ Extend Time
          </button>
          <button className="action-btn set-offline" disabled={isProcessing} onClick={onGoOffline}>
            Set Offline
          </button>
        </div>
      </div>
    );
  }

  // Offline state
  return (
    <div className="status-card offline">
      <div className="status-label">
        <span className="status-dot"></span>
        You are offline
      </div>
      <div className="status-headline">Offline</div>
      <div className="status-sub">Pick a duration below to come back.</div>

      <div className="status-actions single">
        <button
          className="action-btn extend"
          disabled={isProcessing}
          onClick={() => {
            document.getElementById('goLiveSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          ⚡ Go Online Now
        </button>
      </div>
    </div>
  );
}
