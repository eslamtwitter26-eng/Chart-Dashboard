import { AnalysisPage } from "./_analysis-page";
import { report } from "./data";

export function ExpandedTradeAnalysis() {
  return <AnalysisPage initialSelected={report.cards.find(card => card.id === "gold") ?? report.cards[0]} />;
}
