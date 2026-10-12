import { test } from "node:test";
import assert from "node:assert/strict";
import { tradingViewUrl } from "./tradingview.ts";
import { INDICATORS } from "./indicators.ts";

const base = { symbol: "FX:EURUSD", interval: "D", theme: "dark", chartType: "candles", indicators: [] };
const config = url => JSON.parse(decodeURIComponent(new URL(url).hash.slice(1)));

test("selected studies are actual arrays in the official widget configuration hash", () => {
  const studies = ["RSI@tv-basicstudies", "MACD@tv-basicstudies", "Stochastic@tv-basicstudies"];
  const url = new URL(tradingViewUrl({ ...base, indicators: studies }));
  assert.equal(url.pathname, "/embed-widget/advanced-chart/");
  assert.equal(url.searchParams.get("studies"), null);
  assert.deepEqual(config(url).studies, studies);
  assert.equal(config(url).hide_legend, false);
});

test("all offered indicator identifiers are passed through, while invalid and duplicate values are removed", () => {
  const all = INDICATORS.map(item => item.id);
  assert.deepEqual(config(tradingViewUrl({ ...base, indicators: [...all, all[0], "invalid", null] })).studies, all);
});

test("changing or clearing indicators changes the iframe identity URL", () => {
  const empty = tradingViewUrl(base);
  const rsi = tradingViewUrl({ ...base, indicators: ["RSI@tv-basicstudies"] });
  const macd = tradingViewUrl({ ...base, indicators: ["MACD@tv-basicstudies"] });
  assert.notEqual(empty, rsi);
  assert.notEqual(rsi, macd);
  assert.equal(tradingViewUrl({ ...base, indicators: undefined }), empty);
  assert.deepEqual(config(empty).studies, []);
  assert.equal(config(empty).hide_legend, true);
});

test("chart symbol, timeframe, theme and Line/Candles settings are retained with typed flags", () => {
  const settings = config(tradingViewUrl({ ...base, symbol: "NASDAQ:AAPL", interval: "60", theme: "light", chartType: "line" }));
  assert.equal(settings.symbol, "NASDAQ:AAPL");
  assert.equal(settings.interval, "60");
  assert.equal(settings.theme, "light");
  assert.equal(settings.style, "2");
  assert.equal(config(tradingViewUrl(base)).style, "1");
  assert.equal(settings.hide_top_toolbar, true);
  assert.equal(settings.allow_symbol_change, false);
  assert.equal(settings.autosize, true);
});
