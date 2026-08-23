import type { AgentState } from '../types';
import useCountdown from '../useCountdown';

interface Props {
  state: AgentState;
  onSelectDuration: (minutes: number) => void; // go-online (offline) or extend (live)
  onGoOffline: () => void;
  onTimerExpired: () => void;
  isProcessing: boolean;
}

interface DurationConfig {
  value: number;
  num: string;
  label: string;
}

const DURATIONS: DurationConfig[] = [
  { value: 15, num: '15', label: 'MIN' },
  { value: 30, num: '30', label: 'MIN' },
  { value: 45, num: '45', label: 'MIN' },
  { value: 60, num: '60', label: 'MIN' },
  { value: 120, num: '120', label: 'MIN' },
];

export default function StatusZone({
  state,
  onSelectDuration,
  onGoOffline,
  onTimerExpired,
  isProcessing,
}: Props) {
  const isLive = state.status.is_live;
  const available = state.available_durations;
  const recommended = state.recommended_duration;

  const { hours, minutes, seconds } = useCountdown(
    state.status.live_until,
    state.status.total_duration_minutes,
    onTimerExpired,
  );

  const countText = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="zone">
      <div className="zh">
        <h3>Your status</h3>
        <span>{isLive ? 'tap a duration to extend' : 'tap a duration to go online'}</span>
      </div>

      <div className={`livebox ${isLive ? 'on' : 'off'}`}>
        <div className="st">
          <span className="dot" />
          {isLive ? 'YOU ARE VISIBLE TO PLAYERS' : 'YOU ARE OFFLINE'}
        </div>
        {isLive ? (
          <div className="count">
            {countText}
            <small>time remaining</small>
          </div>
        ) : (
          <div className="count headline">
            Offline
            <small>pick a duration below to come back</small>
          </div>
        )}
      </div>

      <div className="durs">
        {DURATIONS.map((dur) => {
          const isAvailable = available.includes(dur.value);
          const isRecommended = dur.value === recommended;
          return (
            <button
              key={dur.value}
              type="button"
              className={`dur${isRecommended ? ' rec' : ''}`}
              disabled={!isAvailable || isProcessing}
              onClick={() => isAvailable && onSelectDuration(dur.value)}
            >
              <b>{dur.num}</b>
              <span>{dur.label}</span>
            </button>
          );
        })}
      </div>

      {isLive ? (
        <button className="offbtn" type="button" disabled={isProcessing} onClick={onGoOffline}>
          Go offline
        </button>
      ) : null}
    </div>
  );
}
