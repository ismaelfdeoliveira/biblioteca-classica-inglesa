import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 1 * 60 * 1000; // 1 minute before timeout
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'click',
  'mousemove',
  'touchstart',
  'keydown',
];

interface SessionTimeoutState {
  showWarning: boolean;
  secondsRemaining: number;
  expired: boolean;
  stayConnected: () => void;
}

export function useSessionTimeout(isActive: boolean, onExpire: () => void): SessionTimeoutState {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [expired, setExpired] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clearTimers = useCallback(() => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timeoutTimerRef.current = null;
    warningTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    setSecondsRemaining(60);

    // Warning timer: fires 1 minute before timeout
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(60);
      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    // Hard timeout: fires at full 30 minutes
    timeoutTimerRef.current = setTimeout(() => {
      setExpired(true);
      setShowWarning(false);
      clearTimers();
      (async () => {
        await supabase.auth.signOut();
        onExpireRef.current();
      })();
    }, TIMEOUT_MS);
  }, [clearTimers]);

  const stayConnected = useCallback(() => {
    lastActivityRef.current = Date.now();
    resetTimers();
  }, [resetTimers]);

  // Activity tracking
  useEffect(() => {
    if (!isActive) {
      clearTimers();
      setShowWarning(false);
      setExpired(false);
      return;
    }

    resetTimers();

    const handleActivity = () => {
      const now = Date.now();
      // Throttle: ignore if less than 5s since last reset
      if (now - lastActivityRef.current > 5000) {
        lastActivityRef.current = now;
        resetTimers();
      } else {
        lastActivityRef.current = now;
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearTimers();
    };
  }, [isActive, resetTimers, clearTimers]);

  return { showWarning, secondsRemaining, expired, stayConnected };
}
