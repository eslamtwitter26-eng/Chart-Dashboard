import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ANALYSIS_SCHOOLS, normalizeSchool, buildPineScript, analysisChartUrl, pineFilename } from "./pine-analysis.ts";

const source = readFileSync(new URL("../assets/analysis-schools.pine", import.meta.url), "utf8");

test("every school generates a complete v6 script with the selected default and all school options", () => {
  for (const school of ANALYSIS_SCHOOLS) {
    const script = buildPineScript(source, school.id);
    assert.ok(script.startsWith("//@version=6\n"));
    assert.ok(script.includes(`input.string("${school.id}", "Analysis school"`));
    for (const option of ANALYSIS_SCHOOLS) assert.ok(script.includes(`"${option.id}"`));
    assert.ok(script.includes("alertcondition("));
    assert.match(pineFilename(school.id), /^chart-dashboard-[a-z-]+\.pine$/);
  }
});

test("defaults and missing template errors are explicit", () => {
  assert.equal(normalizeSchool(undefined), "ICT");
  assert.equal(normalizeSchool("invalid"), "ICT");
  assert.throws(() => buildPineScript("", "ICT"), /missing/);
  assert.throws(() => buildPineScript("//@version=6\nindicator('Broken')", "ICT"), /missing/);
});

test("handoff preserves exact chart symbol and interval without a new data source", () => {
  for (const interval of ["M", "W", "D", "240", "60", "30", "15", "5", "1"]) {
    for (const symbol of ["TVC:GOLD", "FX:EURUSD", "NYMEX:CL1!", "FOREXCOM:NSXUSD"]) {
      const url = new URL(analysisChartUrl({ symbol, interval, label: "Test" }));
      assert.equal(url.origin, "https://www.tradingview.com");
      assert.equal(url.pathname, "/chart/");
      assert.equal(url.searchParams.get("symbol"), symbol);
      assert.equal(url.searchParams.get("interval"), interval);
    }
  }
});

test("source retains closed-bar and pivot-delay guards and does not request external series or place trades", () => {
  assert.ok(source.includes("if barstate.isconfirmed"));
  assert.ok(source.includes("ta.pivothigh(high, swingLen, swingLen)"));
  assert.ok(source.includes("ta.pivotlow(low, swingLen, swingLen)"));
  assert.ok(source.includes('patternState := "No supported candidate at latest pivots"'));
  assert.ok(source.includes("low > high[2]"));
  assert.ok(source.includes("high < low[2]"));
  assert.ok(source.includes("w3 >= math.min(w1, w5)"));
  const executable = source.split("\n").filter(line => !line.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(executable, /request\.|strategy\.|lookahead_on|TWELVE_DATA/);
});

// Evaluate the actual scalar rule expressions from the Pine source against
// fixtures. These tests validate math, NOT Pine compilation or chart execution.
function rule(name, values) {
  const expression = source.match(new RegExp(`bool ${name} = ([^\\n]+)`))?.[1];
  assert.ok(expression, `Missing rule ${name}`);
  const js = expression.replaceAll(/\band\b/g, "&&").replaceAll(/\bor\b/g, "||").replaceAll("math.min", "Math.min");
  const functions = {
    f_near: (value, target) => Math.abs(value - target) <= 0.04,
    f_between: (value, low, high) => value >= low - 0.04 && value <= high + 0.04,
  };
  const context = { ...functions, ...values };
  return new Function(...Object.keys(context), `return (${js});`)(...Object.values(context));
}

test("Gartley and Bat scalar rules accept representative bullish and mirrored bearish candidates, not invalid ratios", () => {
  for (const [name, points] of [
    ["gartley", [0, 100, 38.2, 83.2, 21.4]],
    ["bat", [0, 100, 50, 74.9, 11.4]],
  ]) {
    for (const direction of [1, -1]) {
      const [x, a, b, c, d] = points.map(value => value * direction);
      const xa = Math.abs(a - x), ab = Math.abs(b - a), bc = Math.abs(c - b), cd = Math.abs(d - c);
      assert.equal(rule("geometry", { x, a, b, c, d, direction }), true);
      const ratios = { rAB: ab / xa, rBC: bc / ab, rCD: cd / bc, rAD: Math.abs(d - a) / xa, rABCD: cd / ab };
      assert.equal(rule(name, ratios), true);
      assert.equal(rule(name, { ...ratios, rAB: 0.9 }), false);
      assert.equal(rule(name, { ...ratios, rAD: 1.2 }), false);
      assert.equal(rule("geometry", { x, a, b, c, d: -10 * direction, direction }), false);
    }
  }
});

test("impulse rules reject origin breaks, wave-4 overlap, shortest wave-3 and truncated wave-5", () => {
  const check = points => {
    const [p0, p1, p2, p3, p4, p5] = points;
    return rule("impulse", { p0, p1, p2, p3, p4, p5, w1: p1 - p0, w3: p3 - p2, w5: p5 - p4 });
  };
  assert.equal(check([0, 10, 5, 25, 15, 35]), true);
  assert.equal(check([0, 10, -1, 25, 15, 35]), false);
  assert.equal(check([0, 10, 5, 25, 9, 35]), false);
  assert.equal(check([0, 10, 5, 14, 11, 25]), false);
  assert.equal(check([0, 10, 5, 25, 15, 24]), false);
});
