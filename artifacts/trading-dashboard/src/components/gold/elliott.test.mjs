import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

const sandbox = { module: { exports: {} } };
runInNewContext(readFileSync(new URL("../../../public/gold-lab/elliott.js", import.meta.url), "utf8"), sandbox);
const { detect, draw } = sandbox.module.exports;
const base = Date.UTC(2026, 9, 13) / 1000;
function fixture(values, bearish = false, spacing = 60) {
  const v = [values[0] + 10, ...values, values.at(-1) + (values.length % 2 ? 10 : -10)];
  const bars = [];
  for (let j = 0; j < v.length - 1; j++) {
    for (let k = 0; k < 20; k++) {
      let price = v[j] + (v[j + 1] - v[j]) * k / 20;
      if (bearish) price = 250 - price;
      bars.push({ time: base + bars.length * spacing, open: price, close: price,
        high: price + 0.1, low: price - 0.1, closed: true });
    }
  }
  return bars;
}
const full = [100, 110, 104, 124, 115, 130, 120, 126, 112];

test("valid upward/downward impulses and real confirmed A/B/C are numbered", () => {
  for (const bearish of [false, true]) {
    const model = detect(fixture(full, bearish), 3);
    assert.equal(model.patterns.length, 1);
    const p = model.patterns[0];
    assert.equal(p.direction, bearish ? -1 : 1);
    assert.equal(p.labels.join(","), "0,1,2,3,4,5,A,B,C");
    assert.ok(p.wave2Retracement > 0 && p.wave2Retracement < 1);
    assert.ok(p.wave3Extension > 1);
    assert.ok(p.points.every(x => x.confirmedAt > x.time));
  }
});

test("rejects rule violations rather than assigning any zigzag a wave count", () => {
  for (const v of [
    [100, 110, 98, 124, 115, 130], // 2 beyond origin
    [100, 120, 118, 128, 124, 150], // 3 shortest
    [100, 110, 104, 124, 108, 130], // 4 overlaps 1
    [100, 110, 104, 124, 115, 120], // truncated 5
  ]) assert.equal(detect(fixture(v), 3).patterns.length, 0);
  assert.equal(detect([], 3).patterns.length, 0);
});

test("unclosed rows cannot confirm pivots, fabricate waves, or mutate data", () => {
  const bars = fixture(full);
  const before = JSON.stringify(bars);
  const expected = JSON.stringify(detect(bars, 3));
  detect(bars, 3);
  assert.equal(JSON.stringify(bars), before);
  bars.push({ time: bars.at(-1).time + 60, high: 1e8, low: 0, open: 10, close: 1, closed: false });
  assert.equal(JSON.stringify(detect(bars, 3)), expected);
  const pending = fixture(full.slice(0, 6));
  for (const b of pending) if (b.time >= base + 120 * 60) b.closed = false;
  assert.equal(detect(pending, 3).patterns.length, 0);
});

test("same rules work across all 15 frame spacings and sensitivity settings", () => {
  for (const seconds of [60, 180, 300, 900, 1800, 3600, 7200, 14400, 21600, 28800, 43200, 86400, 259200, 604800, 2678400]) {
    for (const depth of [3, 5, 8]) {
      const model = detect(fixture(full, false, seconds), depth);
      assert.equal(model.depth, depth);
      assert.equal(model.patterns.length, 1);
    }
  }
  assert.equal(detect(fixture(full), "invalid").depth, 3);
});

test("ambiguous outside bars are not ordered into invented swings", () => {
  const bars = fixture(full);
  bars[40].high = 200; bars[40].low = 0;
  const model = detect(bars, 3);
  assert.ok(model.pivots.every(p => p.time !== bars[40].time));
  assert.equal(model.patterns.length, 0);
});

test("renderer projects real pivot times/prices and draws numbered canvas labels", () => {
  const texts = [], positions = [];
  const ctx = new Proxy({}, { get: (_, name) => name === "fillText"
    ? (text, x, y) => texts.push({ text, x, y }) : () => {} });
  const canvas = { width: 0, height: 0, clientWidth: 1000, clientHeight: 400, getContext: () => ctx };
  const chart = { priceScale: () => ({ width: () => 60 }), timeScale: () => ({
    height: () => 26, timeToCoordinate: time => (time - base) / 60 * 4,
  }) };
  const series = { priceToCoordinate: price => { positions.push(price); return 350 - price; } };
  const model = detect(fixture(full), 3);
  draw(canvas, chart, series, model);
  assert.equal(texts.map(x => x.text).join(","), "0,1,2,3,4,5,A,B,C");
  assert.ok(texts.every(x => Number.isFinite(x.x) && Number.isFinite(x.y)));
  assert.ok(positions.includes(model.patterns[0].points[0].price));
  assert.equal(canvas.width, 1000);
});
