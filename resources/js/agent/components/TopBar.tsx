interface Props {
  showBellAlert?: boolean;
}

export default function TopBar({ showBellAlert = false }: Props) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-dot"></span>
        Kemerbet · Agent Portal
      </div>
      <button className={`bell-btn${showBellAlert ? ' alert' : ''}`} aria-label="Notifications">
        🔔
      </button>
    </div>
  );
}
