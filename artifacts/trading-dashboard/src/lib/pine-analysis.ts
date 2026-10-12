export const ANALYSIS_SCHOOLS = [
  { id: "ICT", label: "ICT", description: "Fair Value Gaps، سحب السيولة، Order Blocks، وPremium / Discount." },
  { id: "SMC", label: "SMC", description: "بنية السوق BOS / CHoCH، مناطق Order Blocks والسيولة والاختلالات." },
  { id: "Harmonic", label: "Harmonic", description: "مرشحات Gartley وBat باستخدام خمس نقاط ونسب فيبوناتشي." },
  { id: "Elliott Waves", label: "Elliott Waves", description: "ترقيم مرشح لموجة دافعة 1–5، وليس عدًّا كاملًا أو مؤكدًا للموجات." },
] as const;

export type AnalysisSchool = typeof ANALYSIS_SCHOOLS[number]["id"];
export interface AnalysisChart { symbol: string; interval: string; label: string }

export function normalizeSchool(value: unknown): AnalysisSchool {
  return ANALYSIS_SCHOOLS.find(item => item.id === value)?.id ?? "ICT";
}

export function buildPineScript(source: string, school: AnalysisSchool): string {
  const marker = 'input.string("ICT", "Analysis school"';
  if (!source.startsWith("//@version=6") || !source.includes(marker)) {
    throw new Error("Pine source is missing its version or school selector.");
  }
  return source.replace(marker, `input.string(${JSON.stringify(normalizeSchool(school))}, "Analysis school"`);
}

export function analysisChartUrl(chart: AnalysisChart): string {
  const params = new URLSearchParams({ symbol: chart.symbol, interval: chart.interval });
  return `https://www.tradingview.com/chart/?${params}`;
}

export function pineFilename(school: AnalysisSchool): string {
  return `chart-dashboard-${school.toLowerCase().replaceAll(" ", "-")}.pine`;
}
