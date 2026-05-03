import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { fetchState, goOnline, extend, goOffline, subscribe } from './api';
import { registerAndSubscribe, extractSubscriptionKeys } from './pushSubscription';
import type { AgentState, PageState, ToastState } from './types';
import TopBar from './components/TopBar';
import LoadingSpinner from './components/LoadingSpinner';
import InvalidCard from './components/InvalidCard';
import DisabledCard from './components/DisabledCard';
import Greeting from './components/Greeting';
import StatusCard from './components/StatusCard';
import GoLiveSection from './components/GoLiveSection';
import InfoStrip from './components/InfoStrip';
import Activity from './components/Activity';
import Footer from './components/Footer';
import Toast from './components/Toast';
import NotificationBanner from './components/NotificationBanner';
import BottomSheetModal from './components/BottomSheetModal';

const isIE = typeof window !== 'undefined' && /MSIE|Trident\//.test(navigator.userAgent);

export default function AgentApp({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [serverState, setServerState] = useState<AgentState | null>(null);
  const [disabledAgent, setDisabledAgent] = useState<{
    display_number: number;
    telegram_username: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  // --- Derived page state (single source of truth) ---
  const pageState = useMemo<PageState>(() => {
    if (loading) return 'loading';
    if (invalid) return 'invalid';
    if (disabledAgent) return 'disabled';
    if (serverState) return serverState.status.is_live ? 'live' : 'offline';
    return 'loading';
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

  // --- Multi-browser sync: periodic re-fetch + focus re-fetch ---
  const isProcessingRef = useRef(false);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    if (pageState !== 'live' && pageState !== 'offline') return;

    const refresh = () => {
      if (isProcessingRef.current) return;
      fetchState(token)
        .then((data) => {
          if ('status' in data) setServerState(data);
        })
        .catch(() => {});
    };

    const interval = setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [pageState, token]);

  // --- Web Push subscription ---
  useEffect(() => {
    if (permission !== 'granted') return;

    // Note: We don't proactively detect when permission is REVOKED
    // (Notification.permission goes back to 'denied'). The backend's
    // E6 NotificationDispatcher will receive 410 Gone on the next push
    // attempt and mark the subscription inactive then. This is acceptable
    // because the user's revocation is a one-way action they took
    // intentionally.

    const vapidKey = window.__VAPID_PUBLIC_KEY__;
    if (!vapidKey) return;

    void (async () => {
      const subscription = await registerAndSubscribe(vapidKey);
      if (!subscription) return;

      const keys = extractSubscriptionKeys(subscription);
      try {
        await subscribe(token, { ...keys, user_agent: navigator.userAgent });
      } catch (error) {
        console.error('[push] Failed to send subscription to backend:', error);
      }
    })();
  }, [permission, token]);

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
  if (isIE) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h2>Browser not supported</h2>
        <p>Please use Chrome, Edge, Firefox, or Safari.</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <TopBar
        showBellAlert={permission === 'default'}
        onBellClick={permission === 'default' ? () => {
          Notification.requestPermission().then((p) => setPermission(p));
        } : undefined}
      />
      {pageState === 'loading' && <LoadingSpinner />}
      {pageState === 'invalid' && <InvalidCard />}
      {pageState === 'disabled' && disabledAgent && (
        <DisabledCard
          displayNumber={disabledAgent.display_number}
          telegramUsername={disabledAgent.telegram_username}
        />
      )}
      {(pageState === 'live' || pageState === 'offline') && serverState && (
        <>
          <Greeting displayNumber={serverState.agent.display_number} />
          <NotificationBanner permission={permission} onPermissionChange={setPermission} />
          <StatusCard
            state={serverState}
            onGoOffline={() => setOfflineModalOpen(true)}
            onTimerExpired={handleTimerExpired}
            isProcessing={isProcessing}
          />
          <GoLiveSection
            mode={serverState.status.is_live ? 'extend' : 'go-online'}
            available={serverState.available_durations}
            recommended={serverState.recommended_duration}
            onSelect={serverState.status.is_live ? handleExtend : handleGoOnline}
            isProcessing={isProcessing}
          />
          <InfoStrip metrics={serverState.metrics} />
          <Activity events={serverState.recent_activity} />
          <Footer tokenSuffix={serverState.token_suffix} />
        </>
      )}
      <BottomSheetModal
        open={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        onConfirm={() => {
          setOfflineModalOpen(false);
          handleGoOffline();
        }}
        title="Go offline now?"
        description="Players will stop seeing you in the live list. You can come back online any time."
        cancelLabel="Stay live"
        confirmLabel="Yes, go offline"
      />
      {toast && <Toast {...toast} />}
    </div>
  );
}
