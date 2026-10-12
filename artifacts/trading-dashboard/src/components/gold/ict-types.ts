export type ICTFeature = "fvg" | "orderBlock" | "breaker" | "structure" | "liquidity" | "premiumDiscount";
export type ICTDirection = "bullish" | "bearish" | "neutral";
export interface ICTZone {
  id: string;
  kind: "fvg" | "orderBlock" | "breaker" | "premium" | "discount";
  direction: ICTDirection;
  start: number;
  formedAt: number;
  end: number;
  low: number;
  high: number;
  active: boolean;
  mitigationTime?: number;
}
export interface ICTLine {
  id: string;
  kind: "bos" | "choch" | "liquidity" | "equilibrium";
  label: string;
  direction: ICTDirection;
  start: number;
  formedAt: number;
  end: number;
  price: number;
  active: boolean;
}
export interface ICTResult { zones: ICTZone[]; lines: ICTLine[]; closedBars: number }
export type ICTToggles = Record<ICTFeature, boolean>;
