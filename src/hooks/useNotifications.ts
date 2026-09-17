'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export type BrowserPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

const POLL_INTERVAL_MS = 30_000;
// Shared across tabs via localStorage, not component state - a refresh or a
// second tab must not re-toast/re-notify something already surfaced once.
const LAST_SEEN_KEY = 'smartmart-notifications-last-seen';
const BROWSER_NOTIFS_ENABLED_KEY = 'smartmart-browser-notifications-enabled';

function getBrowserPermissionState(): BrowserPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as BrowserPermissionState;
}

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(iso: string) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, iso);
  } catch {
    // Native/in-app "new notification" surfacing degrades to possibly
    // repeating after a refresh - not a functional break (unread count and
    // the notification center itself don't depend on this watermark).
  }
}

function readBrowserNotificationsEnabled(): boolean {
  try {
    const stored = localStorage.getItem(BROWSER_NOTIFS_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

// Polls the existing Notification records for the current user - no
// external push provider, no new real-time infrastructure. Reuses the same
// 30s cadence the notification bell already polled at. Surfaces genuinely
// new notifications (created after a persisted watermark) as an in-app
// toast, and as a native browser Notification when permission is granted
// and the user hasn't opted out at the app level.
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<BrowserPermissionState>('unsupported');
  const [browserNotificationsEnabled, setBrowserNotificationsEnabledState] = useState(true);
  const pollingRef = useRef(false);
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    // Notification.permission/localStorage are client-only; reading them in
    // a lazy useState initializer instead would make the client's first
    // (hydration) render disagree with the server-rendered fallback state
    // and trigger a hydration mismatch, since permission drives what the
    // notification center's permission card renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(getBrowserPermissionState());
    setBrowserNotificationsEnabledState(readBrowserNotificationsEnabled());

    const stored = readLastSeen();
    if (stored) {
      lastSeenRef.current = stored;
    } else {
      // First time this browser has ever polled: seed the watermark to now
      // rather than "the beginning of time", so existing/historical
      // notifications don't all flood in as if they just happened.
      const now = new Date().toISOString();
      lastSeenRef.current = now;
      writeLastSeen(now);
    }
  }, []);

  const setBrowserNotificationsEnabled = useCallback((enabled: boolean) => {
    setBrowserNotificationsEnabledState(enabled);
    try {
      localStorage.setItem(BROWSER_NOTIFS_ENABLED_KEY, String(enabled));
    } catch {
      // Falls back to the in-memory value for this session only.
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<BrowserPermissionState> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result as BrowserPermissionState);
    if (result === 'granted') setBrowserNotificationsEnabled(true);
    return result as BrowserPermissionState;
  }, [setBrowserNotificationsEnabled]);

  const poll = useCallback(async () => {
    if (pollingRef.current || lastSeenRef.current === null) return;
    pollingRef.current = true;
    try {
      const since = lastSeenRef.current;
      const [countRes, listRes] = await Promise.all([
        fetch('/api/notifications/unread-count'),
        fetch(`/api/notifications?since=${encodeURIComponent(since)}`),
      ]);

      const countData = await countRes.json();
      if (countData.success) setUnreadCount(countData.count);

      const listData = await listRes.json();
      if (listData.success && Array.isArray(listData.data) && listData.data.length > 0) {
        const fresh: AppNotification[] = listData.data;
        const newestCreatedAt = fresh.reduce((max, n) => (n.createdAt > max ? n.createdAt : max), since);

        const canNotifyNatively = getBrowserPermissionState() === 'granted' && readBrowserNotificationsEnabled();

        // API returns newest-first; show oldest-of-the-batch first so
        // toasts/notifications appear in the order the events happened.
        for (const notification of [...fresh].reverse()) {
          toast(notification.title, { description: notification.message });
          if (canNotifyNatively) {
            try {
              // tag = the notification's own id: if the same notification
              // somehow gets surfaced twice (e.g. a narrow multi-tab race
              // on the shared watermark), the browser replaces rather than
              // stacks a duplicate.
              new window.Notification(notification.title, {
                body: notification.message,
                tag: notification._id,
              });
            } catch (e) {
              console.error('Error showing browser notification:', e);
            }
          }
        }

        lastSeenRef.current = newestCreatedAt;
        writeLastSeen(newestCreatedAt);
      }
    } catch (error) {
      console.error('Error polling notifications:', error);
    } finally {
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  return {
    unreadCount,
    permission,
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    requestPermission,
  };
}
