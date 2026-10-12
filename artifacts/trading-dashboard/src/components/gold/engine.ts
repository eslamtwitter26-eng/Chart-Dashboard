import {
  createChart, CandlestickSeries, LineSeries, ColorType, TrackingModeExitMode,
  type IChartApi, type ISeriesApi, type IPriceLine, type UTCTimestamp,
} from "lightweight-charts";
import type { GoldBar } from "@workspace/api-client-react";
import type { GoldLevel } from "./storage";
import type { ICTLine, ICTZone } from "./ict-types";
import { ICTPrimitive } from "./ict-primitive";
import { attachTouchNavigation } from "./touch-navigation";

export interface EngineView { bars: GoldBar[]; chartType: "candles" | "line"; levels: GoldLevel[] }
const VIEW_BARS = 120;

export class GoldChartEngine {
  private chart: IChartApi;
  private series: ISeriesApi<"Candlestick" | "Line"> | null = null;
  private kind: string | null = null;
  private lines = new Map<string, IPriceLine>();
  private prim = new ICTPrimitive();
  private ro: ResizeObserver;
  private lastKey = "";
  private count = 0;
  private lastClose: number | undefined;
  private cd: HTMLDivElement;
  private wrap: HTMLElement;
  private zones: ICTZone[] = [];
  private ictLines: ICTLine[] = [];
  private detachTouch: () => void;
  private placeFrame = 0;
  private resizeFrame = 0;

  constructor(private el: HTMLElement, colors: { text: string; grid: string }) {
    this.wrap = el.parentElement ?? el;
    this.chart = createChart(el, {
      autoSize: false, width: el.clientWidth, height: el.clientHeight,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: colors.text, attributionLogo: true },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      timeScale: { timeVisible: true, borderColor: colors.grid, rightOffset: 8, fixRightEdge: false, fixLeftEdge: false },
      rightPriceScale: { borderColor: colors.grid },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
      trackingMode: { exitMode: TrackingModeExitMode.OnTouchEnd },
    });
    this.detachTouch = attachTouchNavigation(el, this.chart);
    this.cd = document.createElement("div");
    this.cd.className = "gl-countdown"; this.cd.dataset.testid = "gold-countdown"; this.cd.setAttribute("data-testid", "gold-countdown");
    this.cd.dataset.state = "unavailable"; this.cd.dataset.seconds = "0"; this.cd.style.display = "none";
    this.wrap.appendChild(this.cd);
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(r => { this.range(r); this.schedulePlace(); });
    let previousWidth = el.clientWidth, previousHeight = el.clientHeight;
    this.ro = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      // Mutating chart layout inside ResizeObserver delivery can create an
      // undelivered-notifications loop on mobile orientation/viewport changes.
      this.resizeFrame = requestAnimationFrame(() => {
        const width = el.clientWidth, height = el.clientHeight;
        if (width > 0 && height > 0 && (width !== previousWidth || height !== previousHeight)) {
          previousWidth = width; previousHeight = height;
          this.chart.resize(width, height);
        }
        this.schedulePlace();
      });
    });
    this.ro.observe(el);
  }
  private range(r: { from: number; to: number } | null) {
    if (!r) return;
    this.wrap.dataset.rangeFrom = r.from.toFixed(2); this.wrap.dataset.rangeTo = r.to.toFixed(2);
  }
  private place() {
    if (!this.series || this.lastClose === undefined) { this.cd.style.display = "none"; return; }
    const y = this.series.priceToCoordinate(this.lastClose);
    if (y === null || y < 0 || y > this.el.clientHeight - 24) { this.cd.style.display = "none"; return; }
    this.cd.style.display = "block";
    this.cd.style.top = `${Math.round(y + 10)}px`;
    this.cd.style.right = "2px";
  }
  private schedulePlace() {
    cancelAnimationFrame(this.placeFrame);
    // Native autoscaling is finalized during chart paint, not the range callback.
    this.placeFrame = requestAnimationFrame(() => this.place());
  }
  setCountdown(text: string, state: string, seconds: number) {
    this.cd.textContent = text; this.cd.dataset.state = state; this.cd.dataset.seconds = String(seconds);
    this.schedulePlace();
  }
  setICT(zones: ICTZone[], lines: ICTLine[]) { this.zones = zones; this.ictLines = lines; this.prim.set(zones, lines); }
  setColors(c: { text: string; grid: string }) {
    this.chart.applyOptions({ layout: { textColor: c.text }, grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } } });
  }
  fit() { this.chart.timeScale().fitContent(); }
  zoom(f: number) {
    const r = this.chart.timeScale().getVisibleLogicalRange(); if (!r) return;
    const mid = (r.from + r.to) / 2, h = ((r.to - r.from) / 2) * f;
    this.chart.timeScale().setVisibleLogicalRange({ from: mid - h, to: mid + h });
  }
  update(v: EngineView, resetKey: string) {
    const c = this.chart;
    if (this.kind !== v.chartType) {
      if (this.series) { this.series.detachPrimitive(this.prim); c.removeSeries(this.series); }
      this.lines.clear();
      this.series = v.chartType === "candles"
        ? c.addSeries(CandlestickSeries, { upColor: "#26a69a", downColor: "#ef5350", borderVisible: false, wickUpColor: "#26a69a", wickDownColor: "#ef5350" })
        : c.addSeries(LineSeries, { color: "#e0b94a", lineWidth: 2 });
      this.series.attachPrimitive(this.prim);
      this.prim.set(this.zones, this.ictLines);
      this.kind = v.chartType;
    }
    const s = this.series!;
    if (v.chartType === "candles") (s as ISeriesApi<"Candlestick">).setData(v.bars.map(b => ({ ...b, time: b.time as UTCTimestamp })));
    else (s as ISeriesApi<"Line">).setData(v.bars.map(b => ({ time: b.time as UTCTimestamp, value: b.close })));
    this.count = v.bars.length;
    this.lastClose = v.bars.length ? v.bars[v.bars.length - 1].close : undefined;

    for (const [id, pl] of this.lines) if (!v.levels.some(l => l.id === id)) { s.removePriceLine(pl); this.lines.delete(id); }
    for (const l of v.levels) if (!this.lines.has(l.id))
      this.lines.set(l.id, s.createPriceLine({ price: l.price, color: "#e0b94a", lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: "" }));
    if (resetKey !== this.lastKey && this.count) {
      this.lastKey = resetKey;
      const n = this.count;
      c.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - VIEW_BARS) - 0.5, to: n - 1 + 8 });
    }
    this.schedulePlace();
  }
  destroy() { this.ro.disconnect(); cancelAnimationFrame(this.resizeFrame); cancelAnimationFrame(this.placeFrame); this.detachTouch(); this.cd.remove(); this.chart.remove(); }
}
