export interface Pt { time: number; value: number }
interface Bar { time: number; close: number }

export function sma(bars: Bar[], period: number): Pt[] {
  const out: Pt[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i - period].close;
    if (i >= period - 1) out.push({ time: bars[i].time, value: sum / period });
  }
  return out;
}

export function ema(bars: Bar[], period: number): Pt[] {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += bars[i].close;
  prev /= period;
  const out: Pt[] = [{ time: bars[period - 1].time, value: prev }];
  for (let i = period; i < bars.length; i++) {
    prev = bars[i].close * k + prev * (1 - k);
    out.push({ time: bars[i].time, value: prev });
  }
  return out;
}

/** Wilder RSI */
export function rsi(bars: Bar[], period = 14): Pt[] {
  if (bars.length <= period) return [];
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) {
    const d = bars[i].close - bars[i - 1].close;
    if (d >= 0) g += d; else l -= d;
  }
  g /= period; l /= period;
  const val = () => (l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l));
  const out: Pt[] = [{ time: bars[period].time, value: val() }];
  for (let i = period + 1; i < bars.length; i++) {
    const d = bars[i].close - bars[i - 1].close;
    g = (g * (period - 1) + Math.max(d, 0)) / period;
    l = (l * (period - 1) + Math.max(-d, 0)) / period;
    out.push({ time: bars[i].time, value: val() });
  }
  return out;
}

/** Extension point: add future JS indicators here. Not a Pine interpreter. */
export const INDICATORS = {
  sma20: { label: "SMA 20", calc: (b: Bar[]) => sma(b, 20) },
  ema50: { label: "EMA 50", calc: (b: Bar[]) => ema(b, 50) },
  rsi14: { label: "RSI 14", calc: (b: Bar[]) => rsi(b, 14) },
} as const;
