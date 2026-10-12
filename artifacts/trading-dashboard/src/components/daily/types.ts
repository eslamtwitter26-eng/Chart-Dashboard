export interface AssetCard {
  id: string; assetName: string; timeframe: string; pivot: string; watchText: string;
  preference: string; alternative: string; comment: string; chartUrl: string;
  direction: "bullish" | "bearish" | "neutral";
}
export interface EmailData {
  subject: string; session: string; date: string; receivedAt: string;
  cards: AssetCard[]; fetchedAt: number; cacheAge?: number;
}
