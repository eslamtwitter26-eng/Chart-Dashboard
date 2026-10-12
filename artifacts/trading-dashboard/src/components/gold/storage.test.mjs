import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSettings, saveSettings, loadLevels, SETTINGS_KEY, OLD_SETTINGS_KEY, LEVELS_KEY } from "./storage.ts";

test("migration keeps frame, style, and price levels but never restores removed Gold indicators", () => {
  const saved = new Map();
  globalThis.localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  saved.set(OLD_SETTINGS_KEY, JSON.stringify({ interval: "4h", chartType: "line", sma: true, ema: true, rsi: true }));
  saved.set(LEVELS_KEY, JSON.stringify([{ id: "fixture-level", price: 4200 }]));
  const next = loadSettings();
  assert.equal(next.interval, "4h"); assert.equal(next.chartType, "line");
  assert.equal("rsi" in next, false); assert.equal("sma" in next, false); assert.equal("ema" in next, false);
  assert.equal(next.ict.fvg, true); assert.equal(next.ict.breaker, true); assert.equal(next.ict.orderBlock, true);
  next.ict.fvg = false; next.ict.liquidity = true;
  saveSettings(next);
  assert.deepEqual(loadSettings(), next);
  assert.deepEqual(loadLevels(), [{ id: "fixture-level", price: 4200 }]);
  saved.set(SETTINGS_KEY, JSON.stringify({ interval: "bogus", chartType: "invalid", ict: { fvg: "false" } }));
  assert.equal(loadSettings().interval, "1day"); assert.equal(loadSettings().ict.fvg, true);
  delete globalThis.localStorage;
});
