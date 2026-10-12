import { test } from "node:test";
import assert from "node:assert/strict";
import { detectICT } from "./ict.ts";
import { candleEndMs } from "./countdown.ts";

const base = Date.parse("2026-10-12T00:00:00Z") / 1000;
const bars = rows => rows.map(([open, high, low, close], i) => ({ time: base + i * 3600, open, high, low, close }));
const done = input => detectICT(input, "1h", candleEndMs(input.at(-1).time, "1h") + 1);
const fvgInput = bars([
  [10, 11, 9, 10.5], [10.5, 14, 10, 13.5], [13.5, 15, 12, 14],
  [14, 14.5, 11.5, 13], [13, 13.5, 10.5, 11],
]);
const structureInput = bars([
  [10, 11, 9, 10.5], [10.5, 12, 10, 11], [11, 15, 10.5, 14],
  [13, 14, 11, 12], [12, 13, 10, 11], [11, 14, 11, 13],
  [13, 18, 12, 17], [17, 17.5, 14, 16], [16, 16.5, 8, 9],
  [9, 11, 8.5, 9.5], [9.5, 10, 6, 7],
]);

test("FVG exact wick boundaries, formation time, partial mitigation and full-fill lifecycle", () => {
  const first = done(fvgInput.slice(0, 3)).zones.find(z => z.kind === "fvg");
  assert.equal(first.low, 11); assert.equal(first.high, 12);
  assert.equal(first.direction, "bullish"); assert.equal(first.formedAt, fvgInput[2].time);
  assert.equal(first.active, true); assert.equal(first.mitigationTime, undefined);
  const partial = done(fvgInput.slice(0, 4)).zones.find(z => z.id === first.id);
  assert.equal(partial.active, true); assert.equal(partial.mitigationTime, fvgInput[3].time);
  const filled = done(fvgInput).zones.find(z => z.id === first.id);
  assert.equal(filled.active, false); assert.equal(filled.end, fvgInput[4].time);
  const inverted = fvgInput.slice(0, 3).map(b => ({ ...b, open: 30 - b.open, high: 30 - b.low, low: 30 - b.high, close: 30 - b.close }));
  const bearish = done(inverted).zones.find(z => z.kind === "fvg");
  assert.equal(bearish.direction, "bearish"); assert.equal(bearish.low, 18); assert.equal(bearish.high, 19);
});

test("unfinished candles and missing history/weekend opening gaps cannot produce FVG signals", () => {
  const q = detectICT(fvgInput.slice(0, 3), "1h", candleEndMs(fvgInput[2].time, "1h") - 1);
  assert.equal(q.closedBars, 2); assert.equal(q.zones.filter(z => z.kind === "fvg").length, 0);
  const gap = fvgInput.slice(0, 3).map((b, i) => ({ ...b, time: b.time + (i === 2 ? 3600 : 0) }));
  assert.equal(done(gap).zones.filter(z => z.kind === "fvg").length, 0);
});

test("all 12 timeframe buckets use the same actual OHLC detection, including calendar months", () => {
  for (const interval of ["1min", "5min", "15min", "30min", "45min", "1h", "2h", "4h", "8h", "1day", "1week", "1month"]) {
    let time = Date.parse("2026-01-01") / 1000;
    const input = fvgInput.slice(0, 3).map(b => {
      const result = { ...b, time };
      time = candleEndMs(time, interval) / 1000;
      return result;
    });
    const r = detectICT(input, interval, time * 1000 + 1);
    assert.equal(r.zones.filter(z => z.kind === "fvg").length, 1, interval);
    assert.equal(r.zones.find(z => z.kind === "fvg").low, 11, interval);
  }
});

test("confirmed structure break creates displacement OB; failure requires later retest for breaker", () => {
  const before = done(structureInput.slice(0, 6));
  assert.equal(before.lines.filter(x => x.kind === "bos").length, 0);
  const bullish = done(structureInput.slice(0, 7));
  const ob = bullish.zones.find(z => z.kind === "orderBlock" && z.direction === "bullish");
  assert.equal(ob.start, structureInput[4].time);
  assert.equal(ob.formedAt, structureInput[6].time);
  assert.equal(ob.low, 10); assert.equal(ob.high, 13);
  assert.equal(bullish.lines.find(l => l.kind === "bos").price, 15);
  const failure = done(structureInput.slice(0, 9));
  assert.equal(failure.zones.find(z => z.id === ob.id).active, false);
  assert.equal(failure.zones.filter(z => z.kind === "breaker").length, 0);
  assert.equal(failure.lines.find(z => z.kind === "choch").direction, "bearish");
  const retest = done(structureInput.slice(0, 10));
  const breaker = retest.zones.find(z => z.kind === "breaker");
  assert.equal(breaker.direction, "bearish"); assert.equal(breaker.low, 10); assert.equal(breaker.high, 13);
  assert.equal(breaker.formedAt, structureInput[9].time);
  const running = detectICT(structureInput.slice(0, 7), "1h", candleEndMs(structureInput[6].time, "1h") - 1);
  assert.equal(running.zones.filter(z => z.kind === "orderBlock").length, 0);
});

test("equal-high liquidity becomes swept, and premium/discount use confirmed pivot midpoint", () => {
  const input = [11, 12, 15, 12, 11, 12, 15.05, 12, 11, 14, 16].map((h, i) => ({
    time: base + i * 3600, open: h - 1.5, high: h, low: h - 2, close: h - 1,
  }));
  const result = done(input);
  const pool = result.lines.find(l => l.label === "BSL");
  assert.equal(pool.price, 15.05); assert.equal(pool.active, false); assert.equal(pool.end, input[10].time);
  const premium = result.zones.find(z => z.kind === "premium");
  const discount = result.zones.find(z => z.kind === "discount");
  assert.equal(premium.low, discount.high);
  assert.equal(result.lines.find(l => l.kind === "equilibrium").price, premium.low);
  assert.equal(premium.low, (premium.high + discount.low) / 2);
});

test("does not fabricate detections on flat bars or mutate the provider's data", () => {
  const flat = bars(Array(20).fill([10, 10, 10, 10]));
  assert.deepEqual(done(flat), { zones: [], lines: [], closedBars: 20 });
  const saved = structuredClone(structureInput);
  const result = done(structureInput);
  assert.deepEqual(structureInput, saved);
  assert.ok(result.zones.every(z => z.low < z.high && z.formedAt >= z.start && z.end >= z.formedAt));
  assert.deepEqual(detectICT([], "1h"), { zones: [], lines: [], closedBars: 0 });
});
