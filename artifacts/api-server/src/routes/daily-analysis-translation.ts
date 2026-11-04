import { Router } from "express";
import {
  TranslateDailyAnalysisBody,
} from "@workspace/api-zod";
import {
  TranslationNotConfiguredError,
  TranslationReportTooLargeError,
  translateDailyAnalysis,
} from "../lib/daily-analysis-translation";

const router = Router();

router.post("/emails/translate", async (req, res) => {
  const body = TranslateDailyAnalysisBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({
      error: "invalid_translation_request",
      message: "بيانات التقرير غير صالحة للترجمة.",
    });
    return;
  }

  try {
    res.json(await translateDailyAnalysis(body.data));
  } catch (error) {
    if (error instanceof TranslationNotConfiguredError) {
      res.status(503).json({
        error: "translation_not_configured",
        message: "الترجمة بالذكاء الاصطناعي غير مهيأة في بيئة النشر هذه.",
      });
      return;
    }
    if (error instanceof TranslationReportTooLargeError) {
      res.status(400).json({
        error: "translation_report_too_large",
        message: "التقرير أطول من الحد المسموح لترجمته دفعة واحدة.",
      });
      return;
    }

    req.log.error(
      { error: error instanceof Error ? error.name : "UnknownError" },
      "Daily Analysis translation failed",
    );
    res.status(502).json({
      error: "translation_failed",
      message: "تعذرت ترجمة التقرير الآن. بقي النص الأصلي كما هو؛ حاول مرة أخرى لاحقًا.",
    });
  }
});

export default router;
