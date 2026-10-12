export interface GoldSettings { interval: string; chartType: "candles" | "line"; sma: boolean; ema: boolean; rsi: boolean }
export interface GoldLevel { id: string; price: number }
export const SETTINGS_KEY = "gold-lab-settings-v1";
export const LEVELS_KEY = "gold-lab-levels-v1";
export const INTERVALS = [
  ["1min", "1m"], ["5min", "5m"], ["15min", "15m"], ["30min", "30m"], ["45min", "45m"], ["1h", "1H"],
  ["2h", "2H"], ["4h", "4H"], ["8h", "8H"], ["1day", "1D"], ["1week", "1W"], ["1month", "1M"],
] as const;
export type Interval = (typeof INTERVALS)[number][0];
const DEF: GoldSettings = { interval: "1day", chartType: "candles", sma: false, ema: false, rsi: false };

export function loadSettings(): GoldSettings {
  try {
    const s = { ...DEF, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    if (!INTERVALS.some(i => i[0] === s.interval)) s.interval = DEF.interval;
    if (s.chartType !== "line") s.chartType = "candles";
    return { interval: s.interval, chartType: s.chartType, sma: !!s.sma, ema: !!s.ema, rsi: !!s.rsi };
  } catch { return DEF; }
}
export function saveSettings(s: GoldSettings) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {} }
export function loadLevels(): GoldLevel[] {
  try {
    const v = JSON.parse(localStorage.getItem(LEVELS_KEY) || "[]");
    return Array.isArray(v) ? v.filter(l => l && typeof l.id === "string" && Number.isFinite(l.price) && l.price > 0) : [];
  } catch { return []; }
}
export function saveLevels(l: GoldLevel[]) { try { localStorage.setItem(LEVELS_KEY, JSON.stringify(l)); } catch {} }
