import { test } from "node:test";
import assert from "node:assert/strict";
import { goldTradingBars } from "./sessions.ts";

const bar = (date, price = 4200) => ({
  time: Date.parse(date) / 1000, open: price, high: price, low: price, close: price,
});

test("compresses summer weekend quotes without changing live OHLC or UTC timestamps", () => {
  const before = { ...bar("2026-10-09T20:00:00Z"), high: 4207, low: 4190, close: 4202 };
  const closed = [
    bar("2026-10-09T21:00:00Z"),
    { ...bar("2026-10-10T12:00:00Z"), high: 4200.3, low: 4199.8 },
    bar("2026-10-11T21:00:00Z"),
  ];
  const reopened = bar("2026-10-11T22:00:00Z", 4210);
  const input = [before, ...closed, reopened];
  const copy = structuredClone(input);
  assert.deepEqual(goldTradingBars(input, "1h"), [before, reopened]);
  assert.equal(goldTradingBars(input, "1h")[0], before);
  assert.deepEqual(input, copy);
});

test("handles winter UTC offsets and the DST transition weekend", () => {
  const winter = [
    bar("2026-01-09T21:00:00Z"), bar("2026-01-09T22:00:00Z"),
    bar("2026-01-11T22:00:00Z"), bar("2026-01-11T23:00:00Z"),
  ];
  assert.deepEqual(goldTradingBars(winter, "1h"), [winter[0], winter[3]]);
  const spring = [bar("2026-03-06T21:00:00Z"), bar("2026-03-08T21:00:00Z"), bar("2026-03-08T22:00:00Z")];
  assert.deepEqual(goldTradingBars(spring, "1h"), [spring[0], spring[2]]);
});

test("does not discard quiet weekday candles or partial-session aggregates", () => {
  const quiet = [bar("2026-10-12T10:00:00Z"), bar("2026-10-12T11:00:00Z")];
  assert.deepEqual(goldTradingBars(quiet, "1h"), quiet);
  const partial = [bar("2026-10-09T20:00:00Z"), bar("2026-10-10T00:00:00Z"), bar("2026-10-11T20:00:00Z")];
  assert.deepEqual(goldTradingBars(partial, "4h"), [partial[0], partial[2]]);
  const days = [bar("2026-10-09T00:00:00Z"), bar("2026-10-10T00:00:00Z"), bar("2026-10-11T00:00:00Z")];
  assert.deepEqual(goldTradingBars(days, "1day"), [days[0], days[2]]);
  assert.equal(goldTradingBars(days, "1week"), days);
  assert.equal(goldTradingBars(days, "1month"), days);
});

test("minute and multi-hour boundaries retain the first actual opening bucket", () => {
  const minutes = [bar("2026-10-09T20:59:00Z"), bar("2026-10-09T21:00:00Z"), bar("2026-10-11T21:59:00Z"), bar("2026-10-11T22:00:00Z")];
  assert.deepEqual(goldTradingBars(minutes, "1min"), [minutes[0], minutes[3]]);
  const eightHours = [bar("2026-10-10T00:00:00Z"), bar("2026-10-11T16:00:00Z")];
  assert.deepEqual(goldTradingBars(eightHours, "8h"), [eightHours[1]]);
  assert.deepEqual(goldTradingBars([], "1h"), []);
});
