import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPaxgKlines, parsePaxgKlines, PaxgDataError } from "./paxg-data.ts";

const fixture = [
  [1_797_000_000_000, "4000.00", "4010.00", "3995.00", "4005.00", "12.5"],
];

test("validates and converts Binance PAXG/USDT kline rows without altering prices", () => {
  assert.deepEqual(parsePaxgKlines(fixture), [{
    openTime: 1_797_000_000_000,
    open: 4000,
    high: 4010,
    low: 3995,
    close: 4005,
    volume: 12.5,
  }]);
});

test("rejects malformed or internally inconsistent kline rows", () => {
  assert.throws(() => parsePaxgKlines([[1, "4000", "3990", "3980", "4005", "1"]]), PaxgDataError);
  assert.throws(() => parsePaxgKlines([[1, "NaN", "4010", "3995", "4005", "1"]]), PaxgDataError);
  assert.throws(() => parsePaxgKlines([["bad"]]), PaxgDataError);
});

test("requests the fixed PAXGUSDT market and forwards bounded candle query values", async () => {
  let requested;
  const result = await fetchPaxgKlines({
    interval: "1h",
    limit: 25,
    startTime: 1_797_000_000_000,
    endTime: 1_797_100_000_000,
  }, async (url, init) => {
    requested = { url: new URL(url), init };
    return new Response(JSON.stringify(fixture), { status: 200 });
  });

  assert.equal(requested.url.origin, "https://data-api.binance.vision");
  assert.equal(requested.url.searchParams.get("symbol"), "PAXGUSDT");
  assert.equal(requested.url.searchParams.get("interval"), "1h");
  assert.equal(requested.url.searchParams.get("limit"), "25");
  assert.equal(requested.url.searchParams.get("startTime"), "1797000000000");
  assert.ok(requested.init.signal);
  assert.deepEqual(result.bars[0].close, 4005);
});
