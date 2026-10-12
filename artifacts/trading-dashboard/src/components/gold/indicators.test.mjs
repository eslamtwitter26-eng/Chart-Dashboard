import { test } from "node:test";
import assert from "node:assert/strict";
import { sma, ema, rsi } from "./indicators.ts";
const bars = values => values.map((close, time) => ({ time, close }));
const rising = bars(Array.from({ length: 60 }, (_, i) => i + 1));

test("SMA uses only available closes and skips incomplete warmup", () => {
  const result = sma(rising, 20);
  assert.equal(result.length, 41);
  assert.deepEqual(result[0], { time: 19, value: 10.5 });
  assert.equal(result.at(-1).value, 50.5);
  assert.deepEqual(sma(rising.slice(0, 3), 20), []);
});
test("EMA seeds at period average, then applies exponential weighting", () => {
  assert.equal(ema(rising, 50)[0].value, 25.5);
  assert.deepEqual(ema(bars([1, 2, 3, 6]), 3), [{ time: 2, value: 2 }, { time: 3, value: 4 }]);
  assert.deepEqual(ema(rising.slice(0, 3), 50), []);
});
test("Wilder RSI has correct warmup, extremes, flat convention and smoothing", () => {
  assert.equal(rsi(rising)[0].time, 14);
  assert.equal(rsi(rising).at(-1).value, 100);
  assert.equal(rsi(bars(Array.from({ length: 30 }, (_, i) => 30 - i))).at(-1).value, 0);
  assert.equal(rsi(bars(Array(30).fill(12))).at(-1).value, 50);
  assert.deepEqual(rsi(rising.slice(0, 14)), []);
  const mixed = rsi(bars([1, 2, 1, 2]), 2);
  assert.equal(mixed[0].value, 50);
  assert.equal(mixed[1].value, 75);
});
