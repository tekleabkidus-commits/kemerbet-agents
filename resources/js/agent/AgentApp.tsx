import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchState, goOnline, extend, goOffline } from './api';
import type { AgentState, PageState, ToastState } from './types';

export default function AgentApp({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [serverState, setServerState] = useState<AgentState | null>(null);
  const [disabledAgent, setDisabledAgent] = useState<{ display_number: number; telegram_username: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // --- Derived page state (single source of truth) ---
  const pageState = useMemo<PageState>(() => {
    if (loading) return 'loading';
    if (invalid) return 'invalid';
    if (disabledAgent) return 'disabled';
    if (serverState) return serverState.status.is_live ? 'live' : 'offline';
    return 'loading'; // defensive fallback
  }, [loading, invalid, disabledAgent, serverState]);

  // --- Initial fetch ---
  useEffect(() => {
    fetchState(token)
      .then((data) => {
        if ('status' in data) {
          setServerState(data);
        } else {
          setDisabledAgent({
            display_number: data.agent.display_number,
            telegram_username: data.agent.telegram_username,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        // TODO Phase E: distinguish 404 from network errors, add retry UI for recoverable failures
        setInvalid(true);
        setLoading(false);
      });
  }, [token]);

  // --- Action handlers ---
  const handleGoOnline = useCallback(
    async (durationMinutes: number) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const data = await goOnline(token, durationMinutes);
        setServerState(data);
        showToast('You are now live', 'success', '✓');
      } catch {
        showToast('Failed to go online', 'warning', '⚠️');
      } finally {
        setIsProcessing(false);
      }
    },
    [token, isProcessing],
  );

  const handleExtend = useCallback(
    async (durationMinutes: number) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const data = await extend(token, durationMinutes);
        setServerState(data);
        showToast('Time extended', 'success', '⚡');
      } catch {
        showToast('Failed to extend', 'warning', '⚠️');
      } finally {
        setIsProcessing(false);
      }
    },
    [token, isProcessing],
  );

  const handleGoOffline = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const data = await goOffline(token);
      setServerState(data);
      showToast('You are now offline', 'warning', '⚠️');
    } catch {
      showToast('Failed to go offline', 'warning', '⚠️');
    } finally {
      setIsProcessing(false);
    }
  }, [token, isProcessing]);

  // --- Timer expiry: re-fetch to get accurate metrics/activity ---
  const handleTimerExpired = useCallback(() => {
    fetchState(token).then((data) => {
      if ('status' in data) {
        setServerState(data);
      }
    });
    showToast('Your session has ended', 'warning', '⚠️');
  }, [token]);

  // --- Toast ---
  function showToast(message: string, type: ToastState['type'], icon: string) {
    setToast({ message, type, icon });
    setTimeout(() => setToast(null), 2400);
  }

  // --- Render ---
  switch (pageState) {
    case 'loading':
      return (
        <div className="wrap">
          <div className="topbar">
            <div className="brand">
              <span className="brand-dot"></span>
              Kemerbet · Agent Portal
            </div>
          </div>
          <div className="loading-state">
            <div className="spinner"></div>
            <div>Loading…</div>
          </div>
        </div>
      );

    case 'invalid':
      return (
        <div className="wrap">
          <div className="topbar">
            <div className="brand">
              <span className="brand-dot"></span>
              Kemerbet · Agent Portal
            </div>
          </div>
          {/* TODO 5B: styled invalid state matching mockup error card */}
          <div className="loading-state">
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠</div>
            <div>Link not valid</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 8 }}>
              This link doesn't exist or has been revoked. Please contact admin for a new link.
            </div>
          </div>
        </div>
      );

    case 'disabled':
      return (
        <div className="wrap">
          <div className="topbar">
            <div className="brand">
              <span className="brand-dot"></span>
              Kemerbet · Agent Portal
            </div>
          </div>
          {/* TODO 5B: styled disabled state with agent identity */}
          <div className="loading-state">
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⊘</div>
            <div>Account disabled</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 8 }}>
              {disabledAgent
                ? `Agent #${String(disabledAgent.display_number).padStart(2, '0')} — your account has been disabled. Please contact admin.`
                : 'Your account has been disabled. Please contact admin.'}
            </div>
          </div>
        </div>
      );

    case 'live':
    case 'offline':
      if (!serverState) return null;
      return (
        <div className="wrap">
          <div className="topbar">
            <div className="brand">
              <span className="brand-dot"></span>
              Kemerbet · Agent Portal
            </div>
          </div>
          {/* TODO 5B: full live/offline UI — greeting, status card, info strip, activity, footer */}
          <div className="greeting">
            <div className="hi">ሰላም 👋</div>
            <h1>
              Hi, you are{' '}
              <span className="num">
                Agent #{String(serverState.agent.display_number).padStart(2, '0')}
              </span>
            </h1>
          </div>
          <div className={`status-card ${pageState}`}>
            <div className="status-label">
              <span className="status-dot"></span>
              You are {pageState}
            </div>
            <div className="status-headline">{pageState === 'live' ? 'Online' : 'Offline'}</div>
            <div className="status-sub">
              {pageState === 'live'
                ? 'Players can see your card and message you.'
                : 'Pick a duration below to come back.'}
            </div>
          </div>
          {/* TODO 5B: countdown, progress bar, action buttons, go-live section, info strip, activity, footer */}
          {/* Toast placeholder */}
          {toast && (
            <div className={`toast show ${toast.type}`}>
              <span className="toast-icon">{toast.icon}</span>
              <span>{toast.message}</span>
            </div>
          )}
        </div>
      );
  }
}
