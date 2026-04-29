import { useState, useEffect, useRef } from 'react';

interface CountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  progressPercent: number;
}

const ZERO: CountdownResult = { hours: 0, minutes: 0, seconds: 0, progressPercent: 0 };

export default function useCountdown(
  liveUntil: string | null,
  totalDurationMinutes: number | null,
  onExpired: () => void,
): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(ZERO);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!liveUntil || !totalDurationMinutes) {
      setResult(ZERO);
      return;
    }

    const endMs = new Date(liveUntil).getTime();
    const totalMs = totalDurationMinutes * 60_000;

    function tick() {
      const remainingMs = endMs - Date.now();

      if (remainingMs <= 0) {
        setResult(ZERO);
        onExpiredRef.current();
        return false; // signal to clear interval
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      setResult({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
        progressPercent: Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)),
      });
      return true; // keep ticking
    }

    // Initial tick
    if (!tick()) return;

    const id = setInterval(() => {
      if (!tick()) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [liveUntil, totalDurationMinutes]);

  return result;
}
