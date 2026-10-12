export const INDICATORS = [
  { id: "RSI@tv-basicstudies", label: "RSI", name: "Relative Strength Index", group: "Momentum" },
  { id: "MACD@tv-basicstudies", label: "MACD", name: "Moving Average Convergence Divergence", group: "Momentum" },
  { id: "Stochastic@tv-basicstudies", label: "Stochastic", name: "Stochastic Oscillator", group: "Momentum" },
  { id: "StochasticRSI@tv-basicstudies", label: "Stochastic RSI", name: "Stochastic Relative Strength Index", group: "Momentum" },
  { id: "CCI@tv-basicstudies", label: "CCI", name: "Commodity Channel Index", group: "Momentum" },
  { id: "MOM@tv-basicstudies", label: "Momentum", name: "Price Momentum", group: "Momentum" },
  { id: "ROC@tv-basicstudies", label: "ROC", name: "Rate of Change", group: "Momentum" },
  { id: "MASimple@tv-basicstudies", label: "SMA", name: "Simple Moving Average", group: "Trend" },
  { id: "MAExp@tv-basicstudies", label: "EMA", name: "Exponential Moving Average", group: "Trend" },
  { id: "IchimokuCloud@tv-basicstudies", label: "Ichimoku", name: "Ichimoku Cloud", group: "Trend" },
  { id: "PSAR@tv-basicstudies", label: "Parabolic SAR", name: "Parabolic Stop and Reverse", group: "Trend" },
  { id: "VWAP@tv-basicstudies", label: "VWAP", name: "Volume Weighted Average Price", group: "Trend" },
  { id: "BB@tv-basicstudies", label: "Bollinger Bands", name: "Bollinger Bands", group: "Volatility" },
  { id: "ATR@tv-basicstudies", label: "ATR", name: "Average True Range", group: "Volatility" },
] as const;

export type IndicatorId = typeof INDICATORS[number]["id"];

export function normalizeIndicators(value: unknown): IndicatorId[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<string>(INDICATORS.map(indicator => indicator.id));
  return [...new Set(value.filter((id): id is IndicatorId => typeof id === "string" && valid.has(id)))];
}

export function studiesParam(value: unknown): string {
  return JSON.stringify(normalizeIndicators(value));
}
