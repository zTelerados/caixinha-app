'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from './supabase/client';
import { urlBase64ToUint8Array, isIos, isStandalone } from './utils';

export type PushState = 'idle' | 'unsupported' | 'denied' | 'subscribed' | 'requesting';

export function usePush() {
  const [state, setState] = useState<PushState>('idle');
  const [needsHomescreen, setNeedsHomescreen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    if (!supported) {
      setState('unsupported');
      return;
    }
    if (isIos() && !isStandalone()) {
      setNeedsHomescreen(true);
    }
    if (Notification.permission === 'denied') setState('denied');
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.getRegistration().then(reg => {
        reg?.pushManager.getSubscription().then(sub => {
          if (sub) setState('subscribed');
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setState('requesting');
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register('/sw.js'));

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY ausente.');
        setState('denied');
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
        });
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState('idle');
        return;
      }
      await supabase
        .from('profiles')
        .update({ push_subscription: sub.toJSON() })
        .eq('id', user.id);

      setState('subscribed');
    } catch (e) {
      console.error('subscribe push falhou', e);
      setState('idle');
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('id', user.id);
    }
    setState('idle');
  }, []);

  return { state, needsHomescreen, subscribe, unsubscribe };
}
