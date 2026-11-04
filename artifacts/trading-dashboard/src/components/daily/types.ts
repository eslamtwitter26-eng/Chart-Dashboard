export interface AssetCard {
  id: string; assetName: string; timeframe: string; pivot: string; watchText: string;
  preference: string; alternative: string; comment: string; chartUrl: string;
  direction: "bullish" | "bearish" | "neutral";
}
export interface DailyTranslationCard {
  id: string;
  watchText: string;
  preference: string;
  alternative: string;
  comment: string;
  extraAnalysis: string;
}
export interface DailyAnalysisTranslation {
  subject: string;
  session: string;
  reportInsight: string;
  cards: DailyTranslationCard[];
}
export interface EmailData {
  subject: string; session: string; date: string; receivedAt: string;
  cards: AssetCard[]; fetchedAt: number; cacheAge?: number;
}

export function reportDirection(card: AssetCard): AssetCard["direction"] {
  if (/short positions|downside prevails|sell below|bearish/i.test(card.preference)) return "bearish";
  if (/long positions|upside prevails|buy above|bullish|rebound above/i.test(card.preference)) return "bullish";
  return card.direction;
}
