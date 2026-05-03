interface Props {
  showBellAlert?: boolean;
  onBellClick?: () => void;
}

export default function TopBar({ showBellAlert = false, onBellClick }: Props) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-dot"></span>
        Kemerbet · Agent Portal
      </div>
      <button className={`bell-btn${showBellAlert ? ' alert' : ''}`} aria-label="Notifications" onClick={onBellClick}>
        🔔
      </button>
    </div>
  );
}
