/**
 * Web Push subscription utilities.
 * Pure browser API calls — no React dependencies.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function registerAndSubscribe(
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.info('[push] Browser does not support service workers or push notifications');
    return null;
  }

  if (!vapidPublicKey) {
    console.error('[push] VAPID public key not available');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    return subscription;
  } catch (error) {
    console.error('[push] Subscription failed:', error);
    return null;
  }
}

export function extractSubscriptionKeys(sub: PushSubscription): {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
} {
  return {
    endpoint: sub.endpoint,
    p256dh_key: arrayBufferToBase64Url(sub.getKey('p256dh')!),
    auth_key: arrayBufferToBase64Url(sub.getKey('auth')!),
  };
}
