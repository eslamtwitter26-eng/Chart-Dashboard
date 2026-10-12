import type { ICTToggles } from "./ict-types";
export interface GoldSettings { interval: string; chartType: "candles" | "line"; ict: ICTToggles }
export interface GoldLevel { id: string; price: number }
export const OLD_SETTINGS_KEY = "gold-lab-settings-v1";
export const SETTINGS_KEY = "gold-lab-settings-v2";
export const LEVELS_KEY = "gold-lab-levels-v1";
export const INTERVALS = [
  ["1min", "1m"], ["5min", "5m"], ["15min", "15m"], ["30min", "30m"], ["45min", "45m"], ["1h", "1H"],
  ["2h", "2H"], ["4h", "4H"], ["8h", "8H"], ["1day", "1D"], ["1week", "1W"], ["1month", "1M"],
] as const;
export type Interval = (typeof INTERVALS)[number][0];
export const ICT_DEFAULT: ICTToggles = { fvg: true, orderBlock: true, breaker: true, structure: false, liquidity: false, premiumDiscount: false };
const DEF: GoldSettings = { interval: "1day", chartType: "candles", ict: ICT_DEFAULT };

export function loadSettings(): GoldSettings {
  try {
    let raw = localStorage.getItem(SETTINGS_KEY);
    const fromOld = !raw;
    if (!raw) raw = localStorage.getItem(OLD_SETTINGS_KEY);
    const p = JSON.parse(raw || "{}") ?? {};
    const interval = INTERVALS.some(i => i[0] === p.interval) ? p.interval : DEF.interval;
    const chartType = p.chartType === "line" ? "line" : "candles";
    const o = !fromOld && p.ict && typeof p.ict === "object" ? p.ict : {};
    const ict = { ...ICT_DEFAULT } as ICTToggles;
    (Object.keys(ict) as (keyof ICTToggles)[]).forEach(k => { if (typeof o[k] === "boolean") ict[k] = o[k]; });
    return { interval, chartType, ict };
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
