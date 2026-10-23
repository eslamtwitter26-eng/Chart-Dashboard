import type {
  BinanceKline,
  BinanceKlinesResponse,
  GetBinanceKlinesInterval,
  GetBinanceKlinesMarket,
  GetBinanceKlinesSymbol,
} from "@workspace/api-zod";

export class BinanceKlinesError extends Error {
  readonly status: number;
  readonly retryAfter: number;

  constructor(status: number, message: string, retryAfter = 30) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export type BinanceKlinesQuery = {
  market: GetBinanceKlinesMarket;
  symbol: GetBinanceKlinesSymbol;
  interval: GetBinanceKlinesInterval;
  limit: number;
  startTime?: number;
  endTime?: number;
};

function numberAt(value: unknown, label: string, allowZero = false): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "") {
    throw new BinanceKlinesError(502, `أعاد Binance قيمة ${label} غير صالحة.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw new BinanceKlinesError(502, `أعاد Binance قيمة ${label} غير صالحة.`);
  }
  return number;
}

export function parseBinanceKlines(payload: unknown): BinanceKline[] {
  if (!Array.isArray(payload) || payload.length > 1000) {
    throw new BinanceKlinesError(502, "أعاد Binance بيانات شموع غير صالحة.");
  }
  return payload.map((row: unknown): BinanceKline => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new BinanceKlinesError(502, "أعاد Binance شمعة ناقصة.");
    }
    const openTime = numberAt(row[0], "التوقيت", true);
    if (!Number.isSafeInteger(openTime)) {
      throw new BinanceKlinesError(502, "توقيت شمعة Binance غير صالح.");
    }
    const open = numberAt(row[1], "الافتتاح");
    const high = numberAt(row[2], "الأعلى");
    const low = numberAt(row[3], "الأدنى");
    const close = numberAt(row[4], "الإغلاق");
    const volume = numberAt(row[5], "الحجم", true);
    if (high < Math.max(open, close) || low > Math.min(open, close) || low > high) {
      throw new BinanceKlinesError(502, "نطاق أسعار شمعة Binance غير صالح.");
    }
    return { openTime, open, high, low, close, volume };
  });
}

export async function fetchBinanceKlines(
  query: BinanceKlinesQuery,
  fetcher: typeof fetch = fetch,
): Promise<BinanceKlinesResponse> {
  const supportedSymbols = query.market === "futures"
    ? new Set(["XAUUSDT", "XAGUSDT", "BTCUSDT"])
    : new Set(["BTCUSDT", "PAXGUSDT"]);
  if (!supportedSymbols.has(query.symbol)) {
    throw new BinanceKlinesError(400, "هذا الرمز غير متاح في سوق Binance المحدد.");
  }

  const origin = query.market === "futures"
    ? "https://fapi.binance.com/fapi/v1/klines"
    : "https://data-api.binance.vision/api/v3/klines";
  const url = new URL(origin);
  url.search = new URLSearchParams({
    symbol: query.symbol,
    interval: query.interval,
    limit: String(query.limit),
    ...(query.startTime !== undefined ? { startTime: String(query.startTime) } : {}),
    ...(query.endTime !== undefined ? { endTime: String(query.endTime) } : {}),
  }).toString();

  let response: Response;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(6_000) });
  } catch {
    throw new BinanceKlinesError(502, "انتهت مهلة الاتصال بمصدر Binance.");
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After")) || 30;
    throw new BinanceKlinesError(429, "وصل مصدر Binance إلى حد الطلبات مؤقتًا.", retryAfter);
  }
  if (!response.ok) {
    throw new BinanceKlinesError(502, "تعذر جلب الشموع من سوق Binance المحدد.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BinanceKlinesError(502, "أعاد Binance استجابة غير مفهومة.");
  }
  return {
    symbol: query.symbol,
    market: query.market,
    interval: query.interval,
    bars: parseBinanceKlines(payload),
  };
}
