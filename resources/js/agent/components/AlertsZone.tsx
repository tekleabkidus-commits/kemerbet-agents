type Permission = NotificationPermission | 'unsupported';

interface Props {
  permission: Permission;
  onEnable: () => void;
}

/**
 * Rendered in the mockup's "alerts" card style. Wired to the REAL web-push
 * notification permission (the feature that actually delivers reminders),
 * not a Telegram connection — the agent Telegram bot is a later phase.
 */
export default function AlertsZone({ permission, onEnable }: Props) {
  if (permission === 'unsupported') return null;

  const granted = permission === 'granted';

  return (
    <div className="zone" style={{ padding: 12 }}>
      <div className="tg">
        <div className="ti">{'\uD83D\uDD14'}</div>
        <div className="tt">
          <b>Alerts &amp; reminders</b>
          <span>Time warnings before your session ends</span>
        </div>
        {granted ? (
          <span className="st-ok">Enabled {'\u2713'}</span>
        ) : permission === 'denied' ? (
          <span className="st-ok" style={{ color: '#8a98ac' }}>Blocked</span>
        ) : (
          <button type="button" className="st-btn" onClick={onEnable}>
            Enable
          </button>
        )}
      </div>
    </div>
  );
}
