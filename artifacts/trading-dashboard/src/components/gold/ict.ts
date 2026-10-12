import type { GoldBar } from "@workspace/api-client-react";
import type { ICTDirection, ICTLine, ICTResult, ICTZone } from "./ict-types";
import { candleEndMs } from "./countdown.ts";

interface Pivot { index: number; time: number; confirmedAt: number; price: number }
interface PendingBreaker { block: ICTZone; direction: ICTDirection; failedAt: number }

function atr(bars: GoldBar[], before: number): number {
  const first = Math.max(0, before - 14);
  let sum = 0;
  for (let j = first; j < before; j++) {
    const b = bars[j], previous = bars[j - 1]?.close ?? b.open;
    sum += Math.max(b.high - b.low, Math.abs(b.high - previous), Math.abs(b.low - previous));
  }
  return before > first ? sum / (before - first) : 0;
}

/** No forward-looking unfinished candles, synthetic prices, or FVG across missing buckets. */
export function detectICT(input: GoldBar[], interval: string, nowMs = Date.now()): ICTResult {
  const bars = input.filter(b => candleEndMs(b.time, interval) <= nowMs);
  const zones: ICTZone[] = [], lines: ICTLine[] = [];
  if (!bars.length) return { zones, lines, closedBars: 0 };
  const highs: Pivot[] = [], lows: Pivot[] = [];
  let high: Pivot | undefined, low: Pivot | undefined;
  const consumed = new Set<string>();
  const pending: PendingBreaker[] = [];
  let bias = 0;
  const lastTime = bars[bars.length - 1].time;
  const adjacent = (a: GoldBar, b: GoldBar) => candleEndMs(a.time, interval) === b.time * 1000;
  const makeZone = (
    kind: ICTZone["kind"], direction: ICTDirection, origin: GoldBar, formedAt: number, lo: number, hi: number,
  ): ICTZone => ({
    id: `${kind}:${direction}:${origin.time}:${formedAt}`,
    kind, direction, start: origin.time, formedAt, end: lastTime, low: lo, high: hi, active: true,
  });

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], previous = bars[i - 1];

    // Lifecycle updates precede this candle's new detections, so formation is not a "retest".
    for (const z of zones) {
      if (!z.active || b.time <= z.formedAt || z.kind === "premium" || z.kind === "discount") continue;
      const touched = b.low <= z.high && b.high >= z.low;
      if (touched && z.mitigationTime === undefined) z.mitigationTime = b.time;
      const invalid = z.kind === "fvg"
        ? z.direction === "bullish" ? b.low <= z.low : b.high >= z.high
        : z.direction === "bullish" ? b.close < z.low : b.close > z.high;
      if (invalid) {
        z.active = false;
        z.end = b.time;
        if (z.kind === "orderBlock") {
          pending.push({ block: z, direction: z.direction === "bullish" ? "bearish" : "bullish", failedAt: b.time });
        }
      }
    }
    for (let j = pending.length - 1; j >= 0; j--) {
      const p = pending[j], z = p.block;
      if (b.time <= p.failedAt) continue;
      const reversedBack = p.direction === "bullish" ? b.close < z.low : b.close > z.high;
      if (reversedBack) { pending.splice(j, 1); continue; }
      const touches = b.low <= z.high && b.high >= z.low;
      const rejects = p.direction === "bullish" ? b.close > z.high : b.close < z.low;
      if (touches && rejects) {
        zones.push(makeZone("breaker", p.direction, bars.find(x => x.time === z.start)!, b.time, z.low, z.high));
        pending.splice(j, 1);
      }
    }
    for (const line of lines) {
      if (line.kind !== "liquidity" || !line.active || b.time <= line.formedAt) continue;
      const swept = line.label === "BSL" ? b.high > line.price : b.low < line.price;
      if (swept) { line.active = false; line.end = b.time; }
    }

    // Three consecutive real candles. A weekend opening gap is not a three-candle FVG.
    if (i >= 2 && adjacent(bars[i - 2], bars[i - 1]) && adjacent(bars[i - 1], b)) {
      const a = bars[i - 2], middle = bars[i - 1];
      if (a.high < b.low && middle.close > middle.open) {
        zones.push(makeZone("fvg", "bullish", a, b.time, a.high, b.low));
      } else if (a.low > b.high && middle.close < middle.open) {
        zones.push(makeZone("fvg", "bearish", a, b.time, b.high, a.low));
      }
    }

    // A pivot is known only after two closed candles on BOTH sides.
    if (i >= 4) {
      const j = i - 2, candidate = bars[j];
      const neighbors = [bars[j - 2], bars[j - 1], bars[j + 1], bars[j + 2]];
      const tolerance = atr(bars, i) * 0.1;
      const confirm = (type: "high" | "low") => {
        const collection = type === "high" ? highs : lows;
        const price = type === "high" ? candidate.high : candidate.low;
        const pivot: Pivot = { index: j, time: candidate.time, confirmedAt: b.time, price };
        const equal = collection.slice(-6).reverse().find(x => Math.abs(x.price - price) <= tolerance);
        if (equal && tolerance > 0) {
          lines.push({
            id: `liquidity:${type}:${equal.time}:${pivot.time}`, kind: "liquidity", label: type === "high" ? "BSL" : "SSL",
            direction: type === "high" ? "bearish" : "bullish", start: equal.time, formedAt: b.time,
            end: lastTime, price: type === "high" ? Math.max(equal.price, price) : Math.min(equal.price, price), active: true,
          });
        }
        collection.push(pivot);
        if (type === "high") high = pivot; else low = pivot;
      };
      if (neighbors.every(x => candidate.high > x.high)) confirm("high");
      if (neighbors.every(x => candidate.low < x.low)) confirm("low");
    }

    // Close-confirmed structure break; consume each pivot once.
    const bullish = high && previous && high.confirmedAt < b.time &&
      b.close > high.price && previous.close <= high.price && !consumed.has(`high:${high.time}`);
    const bearish = low && previous && low.confirmedAt < b.time &&
      b.close < low.price && previous.close >= low.price && !consumed.has(`low:${low.time}`);
    if (bullish || bearish) {
      const direction: ICTDirection = bullish ? "bullish" : "bearish";
      const pivot = (bullish ? high : low)!;
      const nextBias = bullish ? 1 : -1;
      const kind = bias !== 0 && bias !== nextBias ? "choch" : "bos";
      lines.push({
        id: `${kind}:${direction}:${b.time}`, kind, label: kind.toUpperCase(), direction,
        start: pivot.time, formedAt: b.time, end: b.time, price: pivot.price, active: true,
      });
      consumed.add(`${bullish ? "high" : "low"}:${pivot.time}`);
      bias = nextBias;
      const pastATR = atr(bars, i);
      if (pastATR > 0 && Math.abs(b.close - b.open) >= pastATR * 0.6) {
        // Explicit implementation: full-wick last opposite candle, at most 12 bars back.
        for (let j = i - 1; j >= Math.max(0, i - 12, pivot.index); j--) {
          const origin = bars[j];
          const opposite = bullish ? origin.close < origin.open : origin.close > origin.open;
          if (opposite) {
            if (origin.high > origin.low) zones.push(makeZone("orderBlock", direction, origin, b.time, origin.low, origin.high));
            break;
          }
        }
      }
    }
  }
  if (high && low && high.price > low.price) {
    const mid = (high.price + low.price) / 2;
    const formedAt = Math.max(high.confirmedAt, low.confirmedAt);
    const origin = bars[Math.max(high.index, low.index)];
    zones.push(makeZone("premium", "neutral", origin, formedAt, mid, high.price));
    zones.push(makeZone("discount", "neutral", origin, formedAt, low.price, mid));
    lines.push({
      id: `equilibrium:${formedAt}`, kind: "equilibrium", label: "EQ 50%", direction: "neutral",
      start: formedAt, formedAt, end: lastTime, price: mid, active: true,
    });
  }
  // Bounded history; no detection depends on these rendering limits.
  return { zones: zones.slice(-160), lines: lines.slice(-160), closedBars: bars.length };
}
