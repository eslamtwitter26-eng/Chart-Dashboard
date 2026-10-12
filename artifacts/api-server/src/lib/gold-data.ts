import type { GoldBar, GoldHistory } from "@workspace/api-zod";

export const GOLD_INTERVALS = ["1min", "5min", "15min", "30min", "45min", "1h", "2h", "4h", "8h", "1day", "1week", "1month"] as const;
export type GoldInterval = typeof GOLD_INTERVALS[number];
export const GOLD_REFRESH_SECONDS = 120;

export class GoldDataError extends Error {
  constructor(public status: number, message: string, public retryAfter = 30) {
    super(message);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GoldDataError(502, "أعاد مصدر الذهب بيانات غير صالحة.");
  }
  return value as Record<string, unknown>;
}

/** Validate provider data; never invent prices, fill gaps or use a different asset. */
export function parseGoldBars(payload: unknown): GoldBar[] {
  const data = object(payload);
  const meta = object(data.meta);
  if (meta.symbol !== "XAU/USD" || data.status !== "ok" ||
      !Array.isArray(data.values) || data.values.length === 0 || data.values.length > 600) {
    throw new GoldDataError(502, "لم يُرجع المصدر شموعًا صالحة لأصل XAU/USD.");
  }
  const seen = new Set<number>();
  return data.values.map((value): GoldBar => {
    const row = object(value);
    const date = row.datetime;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/.test(date)) {
      throw new GoldDataError(502, "توقيت شموع الذهب غير صالح.");
    }
    const normalized = date.length === 10 ? `${date}T00:00:00` : date.replace(" ", "T");
    const milliseconds = Date.parse(`${normalized}Z`);
    if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 19) !== normalized) {
      throw new GoldDataError(502, "توقيت شموع الذهب غير صالح.");
    }
    const time = milliseconds / 1000;
    const price = (name: string) => {
      const raw = row[name];
      if ((typeof raw !== "string" && typeof raw !== "number") || raw === "") {
        throw new GoldDataError(502, "أسعار شموع الذهب غير صالحة.");
      }
      const number = Number(raw);
      if (!Number.isFinite(number) || number <= 0) {
        throw new GoldDataError(502, "أسعار شموع الذهب غير صالحة.");
      }
      return number;
    };
    const bar = { time, open: price("open"), high: price("high"), low: price("low"), close: price("close") };
    if (seen.has(time) || bar.high < Math.max(bar.open, bar.close) ||
        bar.low > Math.min(bar.open, bar.close) || bar.low > bar.high) {
      throw new GoldDataError(502, "ترتيب أو نطاق شموع الذهب غير صالح.");
    }
    seen.add(time);
    return bar;
  }).sort((a, b) => a.time - b.time);
}

/** Keep actual valid prices; report omissions instead of repairing OHLC.
 * Provider is explicitly requested in descending order. Never omit its newest
 * row or resolve an ambiguous newest timestamp by pretending the older price
 * is current.
 */
export function prepareGoldBars(payload: unknown): { bars: GoldBar[]; discardedBars: number } {
  const data = object(payload);
  const rows = data.values;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 600) {
    throw new GoldDataError(502, "لم يُرجع المصدر شموع ذهب صالحة.");
  }
  const newest = parseGoldBars({ ...data, values: [rows[0]] })[0];
  const groups = new Map<number, GoldBar[]>();
  rows.forEach((row, index) => {
    try {
      const bar = index === 0 ? newest : parseGoldBars({ ...data, values: [row] })[0];
      const group = groups.get(bar.time) ?? [];
      group.push(bar);
      groups.set(bar.time, group);
    } catch (error) {
      if (!(error instanceof GoldDataError)) throw error;
      // Explicitly counted in discardedBars and explained to the viewer.
    }
  });
  if (groups.get(newest.time)?.length !== 1) {
    throw new GoldDataError(502, "توقيت أحدث شمعة ذهب مكرر؛ لا يمكن تحديد السعر الحالي بثقة.");
  }
  const bars = [...groups.values()].filter(group => group.length === 1).map(group => group[0])
    .sort((a, b) => a.time - b.time);
  return { bars, discardedBars: rows.length - bars.length };
}

/** Shared cache + single-flight requests protect the provider across visitors. */
export class GoldDataService {
  private cache = new Map<GoldInterval, { data: GoldHistory; expires: number }>();
  private failures = new Map<GoldInterval, { error: GoldDataError; expires: number }>();
  private pending = new Map<GoldInterval, Promise<GoldHistory>>();
  private calls: number[] = [];
  constructor(private options: {
    fetcher?: typeof fetch;
    key?: () => string | undefined;
    now?: () => number;
  } = {}) {}
  private now() { return this.options.now?.() ?? Date.now(); }

  async get(interval: GoldInterval): Promise<GoldHistory> {
    const now = this.now();
    const cached = this.cache.get(interval);
    if (cached && cached.expires > now) return cached.data;
    const failed = this.failures.get(interval);
    if (failed && failed.expires > now) throw failed.error;
    const running = this.pending.get(interval);
    if (running) return running;
    const operation = this.retrieve(interval).then(data => {
      this.cache.set(interval, { data, expires: this.now() + GOLD_REFRESH_SECONDS * 1000 });
      this.failures.delete(interval);
      return data;
    }).catch((error: unknown) => {
      const safe = error instanceof GoldDataError ? error :
        new GoldDataError(502, "تعذر الاتصال بمصدر الذهب. حاول لاحقًا.");
      this.failures.set(interval, { error: safe, expires: this.now() + safe.retryAfter * 1000 });
      throw safe;
    }).finally(() => { this.pending.delete(interval); });
    this.pending.set(interval, operation);
    return operation;
  }

  private async retrieve(interval: GoldInterval): Promise<GoldHistory> {
    const key = this.options.key ? this.options.key() : process.env.TWELVE_DATA_API_KEY;
    if (!key) throw new GoldDataError(503, "مفتاح مصدر بيانات الذهب غير مهيأ على الخادم.");
    const now = this.now();
    this.calls = this.calls.filter(time => now - time < 60_000);
    if (this.calls.length >= 5) throw new GoldDataError(429, "طلبات كثيرة لمصدر الذهب. انتظر دقيقة ثم حاول مجددًا.", 60);
    this.calls.push(now);
    // Fixed URL, symbol and bounded history. Credentials stay server-side.
    const url = new URL("https://api.twelvedata.com/time_series");
    url.search = new URLSearchParams({
      symbol: "XAU/USD", interval, outputsize: "600", timezone: "UTC", order: "desc", apikey: key,
    }).toString();
    const response = await (this.options.fetcher ?? fetch)(url, { signal: AbortSignal.timeout(15_000) });
    const raw: unknown = await response.json();
    const body = object(raw);
    const code = typeof body.code === "number" ? body.code : response.status;
    if (response.status === 429 || code === 429) {
      throw new GoldDataError(429, "وصل حساب مصدر البيانات إلى حد الاستخدام. انتظر قبل المحاولة مجددًا.", 120);
    }
    if (!response.ok || body.status !== "ok") {
      // Never forward raw provider errors or request URLs (may contain secrets).
      throw new GoldDataError(502, code === 401 || code === 403 ?
        "مصدر الذهب رفض صلاحيات الحساب. تحقق من صلاحية مفتاح البيانات وخطته." :
        "تعذر جلب هذا الإطار الزمني من مصدر الذهب. حاول لاحقًا.");
    }
    if (object(body.meta).interval !== interval) {
      throw new GoldDataError(502, "أعاد المصدر إطارًا زمنيًا مختلفًا عن المطلوب.");
    }
    const { bars, discardedBars } = prepareGoldBars(body);
    return {
      symbol: "XAU/USD", source: "Twelve Data", interval, timezone: "UTC",
      currency: "USD", unit: "troy ounce", fetchedAt: new Date(this.now()),
      refreshSeconds: GOLD_REFRESH_SECONDS, bars,
      discardedBars,
      dataQualityNote: discardedBars > 0 ?
        `استُبعدت ${discardedBars} شمعة تاريخية من المصدر بسبب نطاق أسعار غير صالح أو توقيت مكرر. لم نغيّر الأسعار أو نملأ الفجوات؛ تعتمد المؤشرات على الشموع السليمة المتاحة فقط.` : "",
    };
  }
}
