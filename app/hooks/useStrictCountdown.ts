"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Countdown that fires onExpire once when reaching 0; resets when `seconds` or `active` changes. */
export function useStrictCountdown(
  seconds: number,
  active: boolean,
  onExpire: () => void,
) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setTimeLeft(seconds);
    expiredRef.current = false;
  }, [seconds, active]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpireRef.current();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, seconds]);

  const reset = useCallback((nextSeconds: number) => {
    expiredRef.current = false;
    setTimeLeft(nextSeconds);
  }, []);

  return { timeLeft, reset };
}
