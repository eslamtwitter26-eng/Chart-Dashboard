import { test } from "node:test";
import assert from "node:assert/strict";
import { GoldDataService, GoldDataError, parseGoldBars, prepareGoldBars, GOLD_INTERVALS } from "./gold-data.ts";

// Unit fixtures only; never used by the app or as a fallback for real prices.
const fixture = (interval = "1min") => ({
  status: "ok", meta: { symbol: "XAU/USD", interval },
  values: [
    { datetime: "2026-01-02 12:01:00", open: "4200", high: "4202", low: "4199", close: "4201" },
    { datetime: "2026-01-02 12:00:00", open: "4198", high: "4201", low: "4197", close: "4200" },
  ],
});
const answer = (data, status = 200) => new Response(JSON.stringify(data), { status });

test("strict UTC OHLC normalization, ascending order and candle-open times", () => {
  const bars = parseGoldBars(fixture());
  assert.equal(bars.length, 2);
  assert.equal(bars[1].time - bars[0].time, 60);
  assert.equal(bars[0].time, Date.parse("2026-01-02T12:00:00Z") / 1000);
  assert.equal(bars[1].close, 4201);
  const monthly = fixture("1month");
  monthly.values = [ { ...monthly.values[0], datetime: "2026-01-01" } ];
  assert.equal(parseGoldBars(monthly)[0].time, Date.parse("2026-01-01T00:00:00Z") / 1000);
});

test("wrong asset, empty data, bad prices, duplicate timestamps and impossible OHLC fail explicitly", () => {
  for (const mutate of [
    d => { d.meta.symbol = "XAG/USD"; },
    d => { d.values = []; },
    d => { d.values[0].close = "NaN"; },
    d => { d.values[0].high = "4198"; },
    d => { d.values[0].datetime = "2026-02-30"; },
    d => { d.values.push({ ...d.values[0] }); },
    d => { d.values[0].open = null; },
  ]) {
    const data = fixture(); mutate(data);
    assert.throws(() => parseGoldBars(data), GoldDataError);
  }
});

test("historical omissions are counted, duplicate dates are not guessed and newest bad data still fails", () => {
  const data = fixture();
  data.values.push({ ...data.values[1] });
  data.values.push({ ...data.values[0], datetime: "2025-01-02 12:00:00", high: "1" });
  const prepared = prepareGoldBars(data);
  assert.equal(prepared.bars.length, 1);
  assert.equal(prepared.bars[0].close, 4201);
  assert.equal(prepared.discardedBars, 3);
  const badNewest = fixture();
  badNewest.values[0].high = "1";
  assert.throws(() => prepareGoldBars(badNewest), GoldDataError);
  const duplicateNewest = fixture();
  duplicateNewest.values.push({ ...duplicateNewest.values[0] });
  assert.throws(() => prepareGoldBars(duplicateNewest), GoldDataError);
});

test("single-flight and 120-second cache prevent repeated provider requests", async () => {
  let calls = 0, now = Date.parse("2026-01-02T12:01:30Z");
  const service = new GoldDataService({
    key: () => "TEST_ONLY_NON_SECRET",
    now: () => now,
    fetcher: async url => {
      calls++;
      assert.equal(url.hostname, "api.twelvedata.com");
      assert.equal(url.searchParams.get("symbol"), "XAU/USD");
      assert.equal(url.searchParams.get("timezone"), "UTC");
      assert.equal(url.searchParams.get("outputsize"), "600");
      return answer(fixture(url.searchParams.get("interval")));
    },
  });
  const [a, b] = await Promise.all([service.get("1min"), service.get("1min")]);
  assert.equal(a, b); assert.equal(calls, 1);
  await service.get("1min"); assert.equal(calls, 1);
  now += 120_001;
  await service.get("1min"); assert.equal(calls, 2);
  await service.get("1month"); assert.equal(calls, 3);
  assert.equal(a.refreshSeconds, 120);
  assert.equal(JSON.stringify(a).includes("TEST_ONLY"), false);
});

test("all twelve intervals work through service and burst requests are bounded", async () => {
  let now = 100_000;
  const service = new GoldDataService({
    key: () => "TEST_ONLY_NON_SECRET", now: () => now,
    fetcher: async url => answer(fixture(url.searchParams.get("interval"))),
  });
  for (let i = 0; i < GOLD_INTERVALS.length; i++) {
    if (i === 5 || i === 10) now += 61_000;
    const data = await service.get(GOLD_INTERVALS[i]);
    assert.equal(data.interval, GOLD_INTERVALS[i]);
    assert.equal(data.bars.length, 2);
  }
  const limited = new GoldDataService({
    key: () => "TEST_ONLY_NON_SECRET", now: () => 100_000,
    fetcher: async url => answer(fixture(url.searchParams.get("interval"))),
  });
  for (const interval of GOLD_INTERVALS.slice(0, 5)) await limited.get(interval);
  await assert.rejects(limited.get("1h"), e => e.status === 429);
});

test("missing key, mismatched interval and provider failures never return fallback bars or raw errors", async () => {
  const missing = new GoldDataService({ key: () => undefined });
  await assert.rejects(missing.get("1min"), e => e.status === 503);
  let calls = 0;
  const rateLimited = new GoldDataService({
    key: () => "TEST_ONLY_NON_SECRET",
    fetcher: async () => { calls++; return answer({ status: "error", code: 429, message: "RAW_SECRET_OR_URL" }); },
  });
  for (let i = 0; i < 2; i++) {
    await assert.rejects(rateLimited.get("1min"), e => e.status === 429 && !e.message.includes("RAW_SECRET"));
  }
  assert.equal(calls, 1);
  const mismatch = new GoldDataService({
    key: () => "TEST_ONLY_NON_SECRET", fetcher: async () => answer(fixture("1month")),
  });
  await assert.rejects(mismatch.get("1min"), e => e.status === 502);
});
