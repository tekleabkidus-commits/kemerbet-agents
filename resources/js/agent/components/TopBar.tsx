import { useEffect, useState } from 'react';

interface Props {
  displayNumber: number;
  isLive: boolean;
  showBellAlert?: boolean;
  onBellClick?: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function addisTime(): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Addis_Ababa',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return '';
  }
}

export default function TopBar({ displayNumber, isLive, showBellAlert = false, onBellClick }: Props) {
  const [clock, setClock] = useState(addisTime());

  useEffect(() => {
    const id = setInterval(() => setClock(addisTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ag-topbar">
      <div className={`ag-logo${isLive ? '' : ' off'}`}>
        <span className="live-indicator" />
        Agent #{pad(displayNumber)}
      </div>
      <div className="ag-clock">
        {clock && <span>EAT {clock}</span>}
        {onBellClick && (
          <button
            className={`ag-bell${showBellAlert ? ' alert' : ''}`}
            aria-label="Notifications"
            onClick={onBellClick}
          >
            {'\uD83D\uDD14'}
          </button>
        )}
      </div>
    </div>
  );
}
