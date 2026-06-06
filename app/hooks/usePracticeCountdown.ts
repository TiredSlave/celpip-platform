"use client";

import { useEffect, useState } from "react";

/** Practice timer: keeps counting past zero (no auto-submit). Resets when `seconds` changes. */
export function usePracticeCountdown(seconds: number, active: boolean) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds, active]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [active, seconds]);

  const reset = () => setTimeLeft(seconds);

  return { timeLeft, reset };
}
