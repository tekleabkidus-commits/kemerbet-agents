import type { NoticeItem } from '../types';

export default function AgentNoticeZone({ notices }: { notices: NoticeItem[] }) {
  if (!notices || notices.length === 0) return null;

  return (
    <div className="zone">
      <div className="zh">
        <h3>Notice board</h3>
        <span>from admin</span>
      </div>
      {notices.map((notice) => {
        const urgent = notice.priority === 'urgent';
        return (
          <div key={notice.id} className={urgent ? 'ag-notice' : 'ag-notice info'}>
            <div className="tag">{urgent ? '\uD83D\uDCE3 New' : '\uD83D\uDCCC Notice'}</div>
            {notice.title && <h4>{notice.title}</h4>}
            <p>{notice.body}</p>
          </div>
        );
      })}
    </div>
  );
}
