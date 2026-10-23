import { Router, type IRouter } from "express";
import {
  GetGoldHistoryQueryParams,
  GetGoldHistoryResponse,
  GetBinanceKlinesQueryParams,
  GetBinanceKlinesResponse,
  GetPaxgKlinesQueryParams,
  GetPaxgKlinesResponse,
} from "@workspace/api-zod";
import { GoldDataError, GoldDataService } from "../lib/gold-data";
import { BinanceKlinesError, fetchBinanceKlines } from "../lib/binance-klines";
import { fetchPaxgKlines, PaxgDataError } from "../lib/paxg-data";

const router: IRouter = Router();
const service = new GoldDataService();

router.get("/gold/paxg/klines", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const query = GetPaxgKlinesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "إطار أو نطاق طلب شموع PAXG/USDT غير صالح." });
    return;
  }
  try {
    const data = await fetchPaxgKlines(query.data);
    res.json(GetPaxgKlinesResponse.parse(data));
  } catch (error: unknown) {
    const safe = error instanceof PaxgDataError ? error :
      new PaxgDataError(502, "تعذر تحميل شموع PAXG/USDT.");
    if (safe.status === 429) res.set("Retry-After", String(safe.retryAfter));
    res.status(safe.status).json({ error: safe.message });
  }
});

router.get("/gold/binance/klines", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const query = GetBinanceKlinesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "سوق أو رمز أو إطار أو نطاق طلب Binance غير صالح." });
    return;
  }
  try {
    const data = await fetchBinanceKlines(query.data);
    res.json(GetBinanceKlinesResponse.parse(data));
  } catch (error: unknown) {
    const safe = error instanceof BinanceKlinesError ? error :
      new BinanceKlinesError(502, "تعذر تحميل شموع Binance.");
    if (safe.status === 429) res.set("Retry-After", String(safe.retryAfter));
    res.status(safe.status).json({ error: safe.message });
  }
});

router.get("/gold/binance/klines", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const query = GetBinanceKlinesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "سوق أو رمز أو إطار أو نطاق طلب Binance غير صالح." });
    return;
  }
  try {
    const data = await fetchBinanceKlines(query.data);
    res.json(GetBinanceKlinesResponse.parse(data));
  } catch (error: unknown) {
    const safe = error instanceof BinanceKlinesError ? error :
      new BinanceKlinesError(502, "تعذر تحميل شموع Binance.");
    if (safe.status === 429) res.set("Retry-After", String(safe.retryAfter));
    res.status(safe.status).json({ error: safe.message });
  }
});

router.get("/gold/history", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const query = GetGoldHistoryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "اختر إطارًا زمنيًا صالحًا للذهب." });
    return;
  }
  try {
    const data = await service.get(query.data.interval);
    res.json(GetGoldHistoryResponse.parse(data));
  } catch (error: unknown) {
    const safe = error instanceof GoldDataError ? error :
      new GoldDataError(502, "تعذر تحميل بيانات الذهب.");
    if (safe.status === 429) res.set("Retry-After", String(safe.retryAfter));
    res.status(safe.status).json({ error: safe.message });
  }
});

export default router;
