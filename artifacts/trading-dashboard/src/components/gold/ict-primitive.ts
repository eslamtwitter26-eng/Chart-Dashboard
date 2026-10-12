import type { ISeriesPrimitive, IPrimitivePaneView, IPrimitivePaneRenderer, SeriesAttachedParameter, Time, IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import type { ICTLine, ICTZone } from "./ict-types";

type Target = { useMediaCoordinateSpace: (cb: (s: { context: CanvasRenderingContext2D; mediaSize: { width: number; height: number } }) => void) => void };

const rgb = (z: ICTZone): string => {
  if (z.kind === "premium") return "239,83,80";
  if (z.kind === "discount") return "38,166,154";
  if (z.kind === "breaker") return "224,165,58";
  if (z.kind === "orderBlock") return z.direction === "bearish" ? "214,110,150" : "78,161,255";
  return z.direction === "bearish" ? "239,83,80" : "38,166,154";
};
const NAMES: Record<string, string> = { fvg: "FVG", orderBlock: "OB", breaker: "BB", premium: "Premium", discount: "Discount" };
const lineRgb = (l: ICTLine) => l.kind === "liquidity" ? "224,185,74" : l.kind === "equilibrium" ? "150,160,175" : l.direction === "bearish" ? "239,83,80" : "38,166,154";

export class ICTPrimitive implements ISeriesPrimitive<Time> {
  private zones: ICTZone[] = [];
  private lines: ICTLine[] = [];
  private chart: IChartApi | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  private req: (() => void) | null = null;
  private view: IPrimitivePaneView = { zOrder: () => "bottom", renderer: () => this.renderer };
  private renderer: IPrimitivePaneRenderer = { draw: (t) => this.draw(t as unknown as Target) };

  attached(p: SeriesAttachedParameter<Time>) { this.chart = p.chart as IChartApi; this.series = p.series; this.req = p.requestUpdate; }
  detached() { this.chart = null; this.series = null; this.req = null; }
  paneViews() { return [this.view]; }
  set(zones: ICTZone[], lines: ICTLine[]) { this.zones = zones; this.lines = lines; this.req?.(); }

  private draw(target: Target) {
    const chart = this.chart, series = this.series;
    if (!chart || !series) return;
    const ts = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: c, mediaSize }) => {
      c.save();
      const W = mediaSize.width;
      const x = (t: number) => ts.timeToCoordinate(t as Time);
      c.font = "10px sans-serif"; c.textBaseline = "top";
      for (const z of this.zones) {
        const x1 = x(z.formedAt); if (x1 === null) continue;
        const x2 = z.active ? W : (x(z.end) ?? W);
        const ya = series.priceToCoordinate(z.high), yb = series.priceToCoordinate(z.low);
        if (ya === null || yb === null) continue;
        const l = Math.max(0, Math.min(x1, x2)), r = Math.min(W, Math.max(x1, x2));
        if (r <= 0 || l >= W) continue;
        const top = Math.min(ya, yb), h = Math.max(1, Math.abs(yb - ya));
        const col = rgb(z);
        c.fillStyle = `rgba(${col},${z.active ? 0.14 : 0.06})`;
        c.fillRect(l, top, r - l, h);
        c.strokeStyle = `rgba(${col},${z.active ? 0.6 : 0.25})`; c.lineWidth = 1;
        c.strokeRect(l + 0.5, top + 0.5, Math.max(0, r - l - 1), Math.max(0, h - 1));
        c.fillStyle = `rgba(${col},${z.active ? 0.95 : 0.55})`;
        c.fillText(`${NAMES[z.kind]}${z.direction === "bullish" ? " +" : z.direction === "bearish" ? " -" : ""}`, l + 3, top + 2);
      }
      for (const ln of this.lines) {
        const structure = ln.kind === "bos" || ln.kind === "choch";
        const x1 = x(structure ? ln.start : ln.formedAt); if (x1 === null) continue;
        const x2 = structure ? (x(ln.end) ?? W) : ln.active ? W : (x(ln.end) ?? W);
        const y = series.priceToCoordinate(ln.price); if (y === null) continue;
        const l = Math.max(0, Math.min(x1, x2)), r = Math.min(W, Math.max(x1, x2));
        if (r <= 0 || l >= W) continue;
        const col = lineRgb(ln);
        c.strokeStyle = `rgba(${col},${ln.active ? 0.9 : 0.5})`; c.lineWidth = 1;
        c.setLineDash(ln.kind === "bos" || ln.kind === "choch" ? [5, 3] : [2, 3]);
        c.beginPath(); c.moveTo(l, y + 0.5); c.lineTo(r, y + 0.5); c.stroke(); c.setLineDash([]);
        c.fillStyle = `rgba(${col},0.95)`;
        c.fillText(ln.label, l + 3, y - 12);
      }
      c.restore();
    });
  }
}
