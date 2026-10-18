import type {
  GetPaxgKlinesInterval,
  PaxgKline,
  PaxgKlinesResponse,
} from "@workspace/api-zod";

export class PaxgDataError extends Error {
  readonly status: number;
  readonly retryAfter: number;

  constructor(status: number, message: string, retryAfter = 30) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

type PaxgQuery = {
  interval: GetPaxgKlinesInterval;
  limit: number;
  startTime?: number;
  endTime?: number;
};

function numberAt(value: unknown, label: string, allowZero = false): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "") {
    throw new PaxgDataError(502, `أعاد مصدر PAXG/USDT قيمة ${label} غير صالحة.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw new PaxgDataError(502, `أعاد مصدر PAXG/USDT قيمة ${label} غير صالحة.`);
  }
  return number;
}

export function parsePaxgKlines(payload: unknown): PaxgKline[] {
  if (!Array.isArray(payload) || payload.length > 1000) {
    throw new PaxgDataError(502, "أعاد مصدر PAXG/USDT بيانات شموع غير صالحة.");
  }
  return payload.map((row: unknown): PaxgKline => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new PaxgDataError(502, "أعاد مصدر PAXG/USDT شمعة ناقصة.");
    }
    const openTime = numberAt(row[0], "التوقيت", true);
    if (!Number.isSafeInteger(openTime)) {
      throw new PaxgDataError(502, "توقيت شمعة PAXG/USDT غير صالح.");
    }
    const open = numberAt(row[1], "الافتتاح");
    const high = numberAt(row[2], "الأعلى");
    const low = numberAt(row[3], "الأدنى");
    const close = numberAt(row[4], "الإغلاق");
    const volume = numberAt(row[5], "الحجم", true);
    if (high < Math.max(open, close) || low > Math.min(open, close) || low > high) {
      throw new PaxgDataError(502, "نطاق أسعار شمعة PAXG/USDT غير صالح.");
    }
    return { openTime, open, high, low, close, volume };
  });
}

export async function fetchPaxgKlines(
  query: PaxgQuery,
  fetcher: typeof fetch = fetch,
): Promise<PaxgKlinesResponse> {
  const url = new URL("https://data-api.binance.vision/api/v3/klines");
  url.search = new URLSearchParams({
    symbol: "PAXGUSDT",
    interval: query.interval,
    limit: String(query.limit),
    ...(query.startTime !== undefined ? { startTime: String(query.startTime) } : {}),
    ...(query.endTime !== undefined ? { endTime: String(query.endTime) } : {}),
  }).toString();

  let response: Response;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(6_000) });
  } catch {
    throw new PaxgDataError(502, "انتهت مهلة الاتصال بمصدر بيانات PAXG/USDT.");
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After")) || 30;
    throw new PaxgDataError(429, "وصل مصدر بيانات PAXG/USDT إلى حد الطلبات مؤقتًا.", retryAfter);
  }
  if (!response.ok) {
    throw new PaxgDataError(502, "تعذر جلب شموع PAXG/USDT من Binance.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PaxgDataError(502, "أعاد مصدر PAXG/USDT استجابة غير مفهومة.");
  }
  return {
    symbol: "PAXGUSDT",
    interval: query.interval,
    bars: parsePaxgKlines(payload),
  };
}
