import {
  createChart, CandlestickSeries, LineSeries, ColorType,
  type IChartApi, type ISeriesApi, type IPriceLine, type UTCTimestamp,
} from "lightweight-charts";
import type { GoldBar } from "@workspace/api-client-react";
import { INDICATORS, type Pt } from "./indicators";
import type { GoldLevel } from "./storage";

export interface EngineView {
  bars: GoldBar[]; chartType: "candles" | "line";
  sma: boolean; ema: boolean; rsi: boolean; levels: GoldLevel[];
}
const t = (p: Pt[]) => p.map(x => ({ time: x.time as UTCTimestamp, value: x.value }));

export class GoldChartEngine {
  private chart: IChartApi;
  private series: ISeriesApi<"Candlestick" | "Line"> | null = null;
  private kind: string | null = null;
  private extra: ISeriesApi<"Line">[] = [];
  private lines = new Map<string, IPriceLine>();
  private ro: ResizeObserver;
  private lastKey = "";

  constructor(private el: HTMLElement, colors: { text: string; grid: string }) {
    this.chart = createChart(el, {
      autoSize: false, width: el.clientWidth, height: el.clientHeight,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: colors.text, attributionLogo: true },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      timeScale: { timeVisible: true, borderColor: colors.grid },
      rightPriceScale: { borderColor: colors.grid },
    });
    this.ro = new ResizeObserver(() => this.chart.resize(el.clientWidth, el.clientHeight));
    this.ro.observe(el);
  }
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
      if (this.series) c.removeSeries(this.series);
      this.lines.clear();
      this.series = v.chartType === "candles"
        ? c.addSeries(CandlestickSeries, { upColor: "#26a69a", downColor: "#ef5350", borderVisible: false, wickUpColor: "#26a69a", wickDownColor: "#ef5350" })
        : c.addSeries(LineSeries, { color: "#e0b94a", lineWidth: 2 });
      this.kind = v.chartType;
    }
    const s = this.series!;
    if (v.chartType === "candles") (s as ISeriesApi<"Candlestick">).setData(v.bars.map(b => ({ ...b, time: b.time as UTCTimestamp })));
    else (s as ISeriesApi<"Line">).setData(v.bars.map(b => ({ time: b.time as UTCTimestamp, value: b.close })));

    this.extra.forEach(x => c.removeSeries(x));
    this.extra = [];
    if (v.sma) this.addLine(INDICATORS.sma20.calc(v.bars), "#4ea1ff", 0);
    if (v.ema) this.addLine(INDICATORS.ema50.calc(v.bars), "#c678dd", 0);
    if (v.rsi) {
      const r = this.addLine(INDICATORS.rsi14.calc(v.bars), "#e5a13a", 1);
      r.createPriceLine({ price: 70, color: "#ef5350", lineStyle: 2, lineWidth: 1, title: "70" });
      r.createPriceLine({ price: 30, color: "#26a69a", lineStyle: 2, lineWidth: 1, title: "30" });
      c.panes()[1]?.setHeight(Math.max(90, this.el.clientHeight * 0.25));
    }
    // levels
    for (const [id, pl] of this.lines) if (!v.levels.some(l => l.id === id)) { s.removePriceLine(pl); this.lines.delete(id); }
    for (const l of v.levels) if (!this.lines.has(l.id))
      this.lines.set(l.id, s.createPriceLine({ price: l.price, color: "#e0b94a", lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: "" }));
    if (resetKey !== this.lastKey) { this.lastKey = resetKey; c.timeScale().fitContent(); }
  }
  private addLine(data: Pt[], color: string, pane: number) {
    const s = this.chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: pane === 1 }, pane);
    s.setData(t(data));
    this.extra.push(s);
    return s;
  }
  destroy() { this.ro.disconnect(); this.chart.remove(); }
}
