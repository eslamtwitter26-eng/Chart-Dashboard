import { test } from "node:test";
import assert from "node:assert/strict";
import { attachTouchNavigation } from "./touch-navigation.ts";

test("hold-drag pans both directions, pinch zooms and cleanup restores native events", () => {
  const el = new EventTarget();
  el.getBoundingClientRect = () => ({ left: 0, top: 0 });
  el.clientHeight = 400;
  let range = { from: 100, to: 200 };
  const chart = {
    timeScale: () => ({
      width: () => 500, getVisibleLogicalRange: () => ({ ...range }),
      setVisibleLogicalRange: r => { range = r; },
    }),
    panes: () => [{ getHeight: () => 370 }],
  };
  const detach = attachTouchNavigation(el, chart);
  const emit = (name, points) => {
    const e = new Event(name, { cancelable: true });
    Object.defineProperty(e, "touches", { value: points.map(([clientX, clientY]) => ({ clientX, clientY })) });
    el.dispatchEvent(e); return e;
  };
  assert.equal(emit("touchstart", [[250, 200]]).defaultPrevented, true);
  emit("touchmove", [[350, 200]]);
  assert.deepEqual(range, { from: 80, to: 180 });
  emit("touchmove", [[150, 200]]);
  assert.deepEqual(range, { from: 120, to: 220 });
  emit("touchend", []);
  emit("touchstart", [[200, 200], [300, 200]]);
  emit("touchmove", [[150, 200], [350, 200]]);
  assert.deepEqual(range, { from: 145, to: 195 });
  emit("touchend", [[350, 200]]);
  emit("touchmove", [[400, 200]]);
  assert.deepEqual(range, { from: 140, to: 190 });
  emit("touchend", []);
  const before = { ...range };
  assert.equal(emit("touchstart", [[510, 200]]).defaultPrevented, false);
  emit("touchmove", [[550, 200]]);
  assert.deepEqual(range, before, "axis gestures must remain native");
  detach();
  assert.equal(emit("touchstart", [[250, 200]]).defaultPrevented, false);
});
