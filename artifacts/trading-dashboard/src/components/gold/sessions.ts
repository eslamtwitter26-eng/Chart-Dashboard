import type { GoldBar } from "@workspace/api-client-react";

const duration: Record<string, number> = {
  "1min": 60, "5min": 300, "15min": 900, "30min": 1800, "45min": 2700,
  "1h": 3600, "2h": 7200, "4h": 14400, "8h": 28800, "1day": 86400,
};
const ny = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", weekday: "short", hour: "2-digit", hourCycle: "h23",
});

function weekendClosed(milliseconds: number): boolean {
  const parts = ny.formatToParts(new Date(milliseconds));
  const day = parts.find(p => p.type === "weekday")?.value;
  const hour = Number(parts.find(p => p.type === "hour")?.value);
  return day === "Sat" || (day === "Fri" && hour >= 17) || (day === "Sun" && hour < 18);
}

/**
 * Display-only weekend compression: Friday 17:00 to Sunday 18:00 New York,
 * automatically accounting for DST. Spot-gold broker schedules can differ.
 * Remove only candles wholly inside this reference closure; never infer a
 * closure from small price changes or trim OHLC from partly open candles.
 * Weekly/monthly aggregates and the original provider response stay intact.
 */
export function goldTradingBars(bars: GoldBar[], interval: string): GoldBar[] {
  const seconds = duration[interval];
  if (!seconds) return bars;
  return bars.filter(b => !(
    weekendClosed(b.time * 1000) &&
    weekendClosed((b.time + seconds) * 1000 - 1)
  ));
}
