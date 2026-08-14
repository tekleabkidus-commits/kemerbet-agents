import { useEffect, useRef, useState } from 'react';
import type { NoticeItem } from '../types';

const AUTO_ADVANCE_MS = 6000;
const INTERACTION_PAUSE_MS = 8000;
const SWIPE_THRESHOLD_PX = 40;

export default function NoticeBoard({ notices }: { notices: NoticeItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);

  const count = notices.length;
  const safeIndex = index >= count ? 0 : index;

  // Clamp when the polled list shrinks.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, []);

  const pauseForInteraction = () => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), INTERACTION_PAUSE_MS);
  };

  const goTo = (i: number) => {
    pauseForInteraction();
    setIndex(((i % count) + count) % count);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pauseForInteraction();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(delta < 0 ? safeIndex + 1 : safeIndex - 1);
  };

  return (
    <div
      className="notif-banner notice-board"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {count > 1 && (
        <button className="notice-nav" aria-label="Previous notice" onClick={() => goTo(safeIndex - 1)}>
          ‹
        </button>
      )}
      <div className="notice-viewport">
        <div className="notice-track" style={{ transform: `translateX(-${safeIndex * 100}%)` }}>
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={notice.priority === 'urgent' ? 'notice-slide urgent' : 'notice-slide'}
            >
              <div className="notif-icon">{notice.priority === 'urgent' ? '📣' : '📢'}</div>
              <div className="notif-text">
                {notice.title && <div className="notif-title">{notice.title}</div>}
                <div className="notif-desc">{notice.body}</div>
              </div>
            </div>
          ))}
        </div>
        {count > 1 && (
          <div className="notice-dots">
            {notices.map((notice, i) => (
              <button
                key={notice.id}
                className={i === safeIndex ? 'notice-dot active' : 'notice-dot'}
                aria-label={`Notice ${i + 1}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}
      </div>
      {count > 1 && (
        <button className="notice-nav" aria-label="Next notice" onClick={() => goTo(safeIndex + 1)}>
          ›
        </button>
      )}
    </div>
  );
}
