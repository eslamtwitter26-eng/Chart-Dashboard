import { useEffect, useState } from "react";
import { Maximize2, ImageOff, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import type { AssetCard, DailyTranslationCard } from "./types";
import { reportDirection } from "./types";
import "./daily.css";
import "./analysis-redesign.css";

export function Direction({ dir, arabic = false }: { dir: AssetCard["direction"]; arabic?: boolean }) {
  const Icon = dir === "bullish" ? TrendingUp : dir === "bearish" ? TrendingDown : Minus;
  const label = arabic
    ? dir === "bullish" ? "صاعد" : dir === "bearish" ? "هابط" : "محايد"
    : dir.toUpperCase();
  return <span className={`dc-dir dc-dir--${dir}`}><Icon size={11} />{label}</span>;
}

export function Field({ label, value, tone }: { label: string; value?: string; tone?: string }) {
  if (!value) return null;
  return (
    <section className={`dc-field ${tone ?? ""}`}>
      <h4>{label}</h4>
      <p>{value}</p>
    </section>
  );
}

export function ChartBlock({ card, large }: { card: AssetCard; large?: boolean }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [card.chartUrl]);
  if (!card.chartUrl || err) {
    return (
      <div className={`dc-chart dc-chart--empty${large ? " dc-chart--large" : ""}`}>
        <ImageOff size={22} />
        <span>{card.chartUrl ? "تعذر تحميل صورة الشارت" : "لا توجد صورة في البريد الأصلي"}</span>
        {card.chartUrl && <a href={card.chartUrl} target="_blank" rel="noreferrer">فتح رابط الصورة</a>}
      </div>
    );
  }
  return (
    <div className={`dc-chart${large ? " dc-chart--large" : ""}`}>
      <img src={card.chartUrl} alt={`${card.assetName} chart`} onError={() => setErr(true)} />
    </div>
  );
}

export function DailyCard({
  card, idx, onExpand, translation, arabic = true,
}: {
  card: AssetCard;
  idx: number;
  onExpand: (c: AssetCard, el: HTMLElement) => void;
  translation?: DailyTranslationCard;
  arabic?: boolean;
}) {
  const dir = reportDirection(card);
  const translated = translation?.id === card.id;
  const text = translated ? translation : card;
  return (
    <article className={`et-card dc--${dir}`} data-testid={`card-analysis-${card.id}`} dir={arabic ? "rtl" : "ltr"}
      style={{ animationDelay: `${idx * 45}ms` }}>
      <header className="et-card-header">
        <span className="et-index">{String(idx + 1).padStart(2, "0")}</span>
        <div className="et-identity">
          <h2><bdi dir="ltr">{card.assetName}</bdi></h2>
          <p>{arabic ? "تحليل خلال اليوم" : "Intraday"} · <bdi dir="ltr">
            {card.timeframe && card.timeframe !== "Not specified" ? card.timeframe : arabic ? "غير محدد" : "Timeframe not specified"}
          </bdi></p>
        </div>
        <Direction dir={dir} arabic={arabic} />
        <button className="et-expand" data-testid={`button-expand-${card.id}`}
          aria-label={arabic ? `عرض التحليل الكامل لـ ${card.assetName}` : `Expand full ${card.assetName} analysis`}
          onClick={e => onExpand(card, e.currentTarget)}>
          {arabic ? "تفاصيل التحليل" : "Full analysis"} <Maximize2 size={12} />
        </button>
      </header>

      <div className="et-chart"><ChartBlock card={card} /></div>

      <div className="et-levels">
        {card.pivot && (
          <div className="et-level">
            <span className="et-level-label">{arabic ? "نقطة الارتكاز · مستوى رئيسي" : "Pivot · key level"}</span>
            <strong dir="auto">{card.pivot}</strong>
          </div>
        )}
        {text.watchText && (
          <div className="et-watch">
            <span className="et-level-label">{arabic ? "ما الذي نراقبه؟" : "Watch from report"}</span>
            <p dir={translated ? "rtl" : "auto"}>{text.watchText}</p>
          </div>
        )}
      </div>

      <div className="et-scenarios">
        {text.preference && (
          <section className="et-scenario">
            <span className="et-section-label">{arabic ? "السيناريو المفضل في التقرير" : "Our preference"}</span>
            <p dir={translated ? "rtl" : "auto"}>{text.preference}</p>
          </section>
        )}
        {text.alternative && (
          <section className="et-scenario et-scenario--alternative">
            <span className="et-section-label">{arabic ? "السيناريو البديل" : "Alternative scenario"}</span>
            <p dir={translated ? "rtl" : "auto"}>{text.alternative}</p>
          </section>
        )}
      </div>

      {text.comment && (
        <section className="et-comment">
          <span className="et-section-label">{arabic ? "تعليق Trading Central" : "Trading Central commentary"}</span>
          <p dir={translated ? "rtl" : "auto"}>{text.comment}</p>
        </section>
      )}

      {translated && translation?.extraAnalysis && (
        <section className="et-ai-insight">
          <span className="et-section-label"><Sparkles size={12} /> قراءة إضافية مبنية على التقرير</span>
          <p>{translation.extraAnalysis}</p>
        </section>
      )}

      <footer className="et-card-footer">
        <span className="et-source-label"><i className="et-source-mark" />Trading Central · {arabic ? "المصدر الأصلي" : "source"}</span>
        <span dir="ltr">{card.timeframe || (arabic ? "تحليل التقرير" : "Report analysis")}</span>
      </footer>
    </article>
  );
}
