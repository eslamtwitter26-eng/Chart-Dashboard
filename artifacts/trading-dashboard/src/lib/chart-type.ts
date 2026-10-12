export type ChartType = "candles" | "line";

export function normalizeChartType(value: unknown): ChartType {
  return value === "line" ? "line" : "candles";
}

export function tradingViewStyle(type: ChartType): string {
  return type === "line" ? "2" : "1";
}
