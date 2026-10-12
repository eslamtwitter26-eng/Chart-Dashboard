import { Router, type IRouter } from "express";
import { GetGoldHistoryQueryParams, GetGoldHistoryResponse } from "@workspace/api-zod";
import { GoldDataError, GoldDataService } from "../lib/gold-data";

const router: IRouter = Router();
const service = new GoldDataService();

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
