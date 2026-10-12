import type { IChartApi } from "lightweight-charts";

/** Single-finger hold+drag pans immediately; two fingers zoom around their midpoint.
 * Capture plot touches before the widget's long-press crosshair can lock navigation.
 * Price/time-axis touches remain native, as do all mouse interactions.
 */
export function attachTouchNavigation(el: HTMLElement, chart: IChartApi): () => void {
  type Gesture = { from: number; to: number; x: number; distance: number; width: number };
  let gesture: Gesture | null = null;
  const x = (e: TouchEvent) => {
    const left = el.getBoundingClientRect().left;
    return (e.touches.length > 1 ? (e.touches[0].clientX + e.touches[1].clientX) / 2 : e.touches[0].clientX) - left;
  };
  const distance = (e: TouchEvent) => e.touches.length > 1
    ? Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) : 0;
  const stop = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); };
  const reset = (e: TouchEvent) => {
    const r = chart.timeScale().getVisibleLogicalRange();
    gesture = e.touches.length && r ? { ...r, x: x(e), distance: distance(e), width: chart.timeScale().width() } : null;
  };
  const start = (e: TouchEvent) => {
    if (!e.touches.length) return;
    const bounds = el.getBoundingClientRect();
    const t = e.touches[0];
    const plot = t.clientX - bounds.left < chart.timeScale().width() &&
      t.clientY - bounds.top < (chart.panes()[0]?.getHeight() ?? el.clientHeight);
    if (!plot && !gesture) return;
    stop(e); reset(e);
  };
  const move = (e: TouchEvent) => {
    if (!gesture || !e.touches.length) return;
    stop(e);
    const g = gesture, currentDistance = distance(e);
    if (!!g.distance !== !!currentDistance) { reset(e); return; }
    const span = g.to - g.from;
    const nextSpan = g.distance ? Math.max(5, Math.min(5000, span * g.distance / Math.max(1, currentDistance))) : span;
    const anchor = g.from + g.x / Math.max(1, g.width) * span;
    const from = anchor - x(e) / Math.max(1, g.width) * nextSpan;
    chart.timeScale().setVisibleLogicalRange({ from, to: from + nextSpan });
  };
  const end = (e: TouchEvent) => {
    if (!gesture) return;
    stop(e); reset(e);
  };
  const menu = (e: Event) => e.preventDefault();
  const options = { capture: true, passive: false };
  el.addEventListener("touchstart", start, options);
  el.addEventListener("touchmove", move, options);
  el.addEventListener("touchend", end, options);
  el.addEventListener("touchcancel", end, options);
  el.addEventListener("contextmenu", menu);
  return () => {
    el.removeEventListener("touchstart", start, options);
    el.removeEventListener("touchmove", move, options);
    el.removeEventListener("touchend", end, options);
    el.removeEventListener("touchcancel", end, options);
    el.removeEventListener("contextmenu", menu);
  };
}
