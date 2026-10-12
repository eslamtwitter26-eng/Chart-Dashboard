import { test } from "node:test";
import assert from "node:assert/strict";
import { candleEndMs, candleCountdown } from "./countdown.ts";

const open = Date.parse("2026-10-12T12:00:00Z") / 1000;
test("all intraday and day/week intervals have correct close timestamps and ticking seconds", () => {
  for (const [interval, seconds] of Object.entries({
    "1min": 60, "5min": 300, "15min": 900, "30min": 1800, "45min": 2700,
    "1h": 3600, "2h": 7200, "4h": 14400, "8h": 28800, "1day": 86400, "1week": 604800,
  })) {
    assert.equal(candleEndMs(open, interval), (open + seconds) * 1000);
    const a = candleCountdown(open, interval, open * 1000 + 1000);
    const b = candleCountdown(open, interval, open * 1000 + 2000);
    assert.equal(a.remainingSeconds, seconds - 1);
    assert.equal(a.remainingSeconds - b.remainingSeconds, 1);
    assert.equal(a.state, "counting");
  }
});
test("monthly end uses actual calendar, leap February and year rollover", () => {
  for (const [a, b] of [
    ["2026-10-01", "2026-11-01"], ["2024-02-01", "2024-03-01"],
    ["2026-02-01", "2026-03-01"], ["2026-12-01", "2027-01-01"],
  ]) assert.equal(candleEndMs(Date.parse(a) / 1000, "1month"), Date.parse(b));
  assert.equal(candleCountdown(Date.parse("2024-02-01") / 1000, "1month", Date.parse("2024-02-28")).text, "2d 00:00:00");
});
test("expired or unavailable quotes never show a running countdown", () => {
  assert.equal(candleCountdown(open, "1min", (open + 60) * 1000).state, "expired");
  assert.equal(candleCountdown(open, "1min", (open + 900) * 1000).remainingSeconds, 0);
  assert.equal(candleCountdown(undefined, "1h").state, "unavailable");
  assert.equal(candleCountdown(open, "1h", (open - 1) * 1000).state, "unavailable");
  assert.equal(candleCountdown(open, "bad", open * 1000).state, "unavailable");
});
