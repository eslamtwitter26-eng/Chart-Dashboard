import { normalizeIndicators } from "./indicators.ts";
import { tradingViewStyle, type ChartType } from "./chart-type.ts";

export function tradingViewUrl({ symbol, interval, theme, chartType, indicators }: {
  symbol: string;
  interval: string;
  theme: "light" | "dark";
  chartType: ChartType;
  indicators: unknown;
}): string {
  const studies = normalizeIndicators(indicators);
  // Match TradingView's official advanced-chart embed protocol: settings belong
  // in the URL hash as typed JSON, not string-valued query parameters.
  const settings = {
    symbol, interval, theme,
    style: tradingViewStyle(chartType),
    autosize: true,
    timezone: "exchange",
    hide_top_toolbar: true,
    hide_side_toolbar: true,
    hide_legend: studies.length === 0,
    allow_symbol_change: false,
    save_image: false,
    withdateranges: false,
    hide_volume: true,
    studies,
    support_host: "https://www.tradingview.com",
  };
  return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(settings))}`;
}
