import type { NoticeItem } from '../types';
import NoticeBoard from './NoticeBoard';

type Permission = NotificationPermission | 'unsupported';

interface Props {
  permission: Permission;
  onPermissionChange: (p: Permission) => void;
  notices: NoticeItem[];
}

export default function NotificationBanner({ permission, onPermissionChange, notices }: Props) {
  if (permission === 'unsupported' || permission === 'denied') return null;

  if (permission === 'granted') {
    if (notices.length > 0) {
      return <NoticeBoard notices={notices} />;
    }

    return (
      <div className="notif-banner success">
        <div className="notif-icon">✓</div>
        <div className="notif-text">
          <div className="notif-title">Notifications enabled</div>
          <div className="notif-desc">You'll get reminders before your time ends</div>
        </div>
      </div>
    );
  }

  // permission === 'default'
  const handleEnable = () => {
    Notification.requestPermission().then((result) => {
      onPermissionChange(result);
    });
  };

  return (
    <div className="notif-banner">
      <div className="notif-icon">🔔</div>
      <div className="notif-text">
        <div className="notif-title">Get reminders</div>
        <div className="notif-desc">10 &amp; 5 min before your time ends</div>
      </div>
      <button className="notif-enable" onClick={handleEnable}>
        Enable
      </button>
    </div>
  );
}
