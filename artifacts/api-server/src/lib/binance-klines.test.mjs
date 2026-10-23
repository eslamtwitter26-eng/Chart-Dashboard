import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchBinanceKlines, parseBinanceKlines, BinanceKlinesError } from "./binance-klines.ts";

const fixture = [
  [1_797_000_000_000, "4000.00", "4010.00", "3995.00", "4005.00", "12.5"],
];

test("validates and converts Binance kline rows without changing OHLC values", () => {
  assert.deepEqual(parseBinanceKlines(fixture), [{
    openTime: 1_797_000_000_000,
    open: 4000,
    high: 4010,
    low: 3995,
    close: 4005,
    volume: 12.5,
  }]);
});

test("rejects malformed and internally inconsistent Binance candles", () => {
  assert.throws(() => parseBinanceKlines([[1, "4000", "3990", "3980", "4005", "1"]]), BinanceKlinesError);
  assert.throws(() => parseBinanceKlines([[1, "NaN", "4010", "3995", "4005", "1"]]), BinanceKlinesError);
  assert.throws(() => parseBinanceKlines([["bad"]]), BinanceKlinesError);
});

test("requests the selected Binance futures symbol and bounded interval", async () => {
  let requested;
  const result = await fetchBinanceKlines({
    market: "futures",
    symbol: "XAUUSDT",
    interval: "1h",
    limit: 25,
    startTime: 1_797_000_000_000,
  }, async (url, init) => {
    requested = { url: new URL(url), init };
    return new Response(JSON.stringify(fixture), { status: 200 });
  });

  assert.equal(requested.url.origin, "https://fapi.binance.com");
  assert.equal(requested.url.pathname, "/fapi/v1/klines");
  assert.equal(requested.url.searchParams.get("symbol"), "XAUUSDT");
  assert.equal(requested.url.searchParams.get("interval"), "1h");
  assert.equal(requested.url.searchParams.get("limit"), "25");
  assert.equal(requested.url.searchParams.get("startTime"), "1797000000000");
  assert.ok(requested.init.signal);
  assert.equal(result.bars[0].close, 4005);
});

test("does not allow a spot-only symbol to be requested from futures", async () => {
  await assert.rejects(
    fetchBinanceKlines({
      market: "futures",
      symbol: "PAXGUSDT",
      interval: "1h",
      limit: 10,
    }),
    (error) => error instanceof BinanceKlinesError && error.status === 400,
  );
});
