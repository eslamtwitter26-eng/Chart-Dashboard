const seconds: Record<string, number> = {
  "1min": 60, "5min": 300, "15min": 900, "30min": 1800, "45min": 2700,
  "1h": 3600, "2h": 7200, "4h": 14400, "8h": 28800, "1day": 86400, "1week": 604800,
};

export function candleEndMs(openTime: number, interval: string): number {
  if (interval === "1month") {
    const start = new Date(openTime * 1000);
    return Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
  }
  return seconds[interval] ? (openTime + seconds[interval]) * 1000 : NaN;
}

export interface CandleCountdown { state: "counting" | "expired" | "unavailable"; text: string; remainingSeconds: number }
export function candleCountdown(openTime: number | undefined, interval: string, nowMs = Date.now()): CandleCountdown {
  if (openTime === undefined) return { state: "unavailable", text: "—", remainingSeconds: 0 };
  const end = candleEndMs(openTime, interval);
  if (!Number.isFinite(end) || nowMs < openTime * 1000) return { state: "unavailable", text: "—", remainingSeconds: 0 };
  const left = Math.max(0, Math.ceil((end - nowMs) / 1000));
  if (!left) return { state: "expired", text: "بانتظار تحديث", remainingSeconds: 0 };
  const days = Math.floor(left / 86400), hours = Math.floor(left / 3600) % 24;
  const minutes = Math.floor(left / 60) % 60, secs = left % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    state: "counting", remainingSeconds: left,
    text: `${days ? `${days}d ` : ""}${days || hours ? `${pad(hours)}:` : ""}${pad(minutes)}:${pad(secs)}`,
  };
}
