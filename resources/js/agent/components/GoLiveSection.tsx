interface Props {
  mode: 'go-online' | 'extend';
  available: number[];
  recommended: number | null;
  onSelect: (durationMinutes: number) => void;
  isProcessing: boolean;
}

interface DurationConfig {
  value: number;
  num: string;
  label: string;
}

const DURATIONS: DurationConfig[] = [
  { value: 15, num: '15', label: 'minutes' },
  { value: 30, num: '30', label: 'minutes' },
  { value: 45, num: '45', label: 'minutes' },
  { value: 60, num: '1', label: 'hour' },
  { value: 120, num: '2', label: 'hours' },
];

export default function GoLiveSection({ mode, available, recommended, onSelect, isProcessing }: Props) {
  return (
    <div className="go-live-section" id="goLiveSection">
      <div className="section-title">{mode === 'extend' ? 'Extend session' : 'Choose duration'}</div>
      <div className="duration-grid">
        {DURATIONS.map((dur) => {
          const isAvailable = available.includes(dur.value);
          const isRecommended = dur.value === recommended;

          return (
            <button
              key={dur.value}
              className={`dur-btn${isRecommended ? ' recommended' : ''}`}
              disabled={!isAvailable || isProcessing}
              style={!isAvailable ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              onClick={() => isAvailable && onSelect(dur.value)}
            >
              <div className="dur-num">{dur.num}</div>
              <div className="dur-label">{dur.label}</div>
            </button>
          );
        })}
        <button className="dur-btn" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
          <div className="dur-num">—</div>
          <div className="dur-label">custom</div>
        </button>
      </div>
      {mode === 'go-online' && (
        <>
          <div className="divider-or">or stay offline</div>
          <button className="offline-btn" disabled style={{ opacity: 0.5 }}>
            You are already offline
          </button>
        </>
      )}
    </div>
  );
}
