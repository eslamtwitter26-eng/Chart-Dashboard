import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { AssetCard, DailyTranslationCard, EmailData } from "./types";
import { reportDirection } from "./types";
import { ChartBlock, Direction } from "./DailyCard";
import "./daily.css";

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function DailyDetail({
  card, meta, style, returnTo, onClose, translation, translatedSession, translatedSubject, arabic = true,
}: {
  card: AssetCard; meta: Pick<EmailData, "subject" | "session" | "date" | "receivedAt">;
  style: React.CSSProperties; returnTo: HTMLElement | null; onClose: () => void;
  translation?: DailyTranslationCard;
  translatedSession?: string;
  translatedSubject?: string;
  arabic?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.querySelector<HTMLElement>(".dd-close")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab" || !box.current) return;
      const els = Array.from(box.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("keydown", key, true); document.body.style.overflow = prev; returnTo?.focus(); };
  }, [returnTo]);

  const rec = meta.receivedAt
    ? (isNaN(Date.parse(meta.receivedAt))
      ? meta.receivedAt
      : new Date(meta.receivedAt).toLocaleString(arabic ? "ar-EG" : undefined))
    : "";
  const dir = reportDirection(card);
  const translated = translation?.id === card.id;
  const text = translated ? translation : card;

  return (
    <div className="et-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={box} className={`et-dialog dc--${dir}`} style={style} role="dialog" aria-modal="true" dir={arabic ? "rtl" : "ltr"}
        aria-labelledby="et-dialog-title" data-testid="dialog-analysis-detail">
        <header className="et-dialog-head">
          <div className="et-dialog-head-main">
            <span className="et-section-label">Trading Central · {arabic ? translatedSession || "التقرير اليومي" : meta.session}</span>
            <h2 id="et-dialog-title"><bdi dir="ltr">{card.assetName}</bdi></h2>
            <p>{arabic ? "تحليل خلال اليوم" : "Intraday analysis"} · <bdi dir="ltr">
              {card.timeframe && card.timeframe !== "Not specified" ? card.timeframe : arabic ? "غير محدد" : "Timeframe not specified"}
            </bdi></p>
          </div>
          <Direction dir={dir} arabic={arabic} />
          <button className="et-close" data-testid="button-close-detail" onClick={onClose} aria-label="Close analysis details">
            <X size={14} /> {arabic ? "إغلاق" : "Close"} <kbd>Esc</kbd>
          </button>
        </header>

        <div className="et-dialog-scroll">
          <div className="et-detail-layout">
            <div className="et-detail-visual">
              <div className="et-chart"><ChartBlock card={card} large /></div>
            </div>
            <aside className="et-detail-side">
              {card.pivot && (
                <section className="et-detail-pivot">
                  <div>
                    <span className="et-section-label">{arabic ? "نقطة الارتكاز · مستوى رئيسي" : "Pivot · key level"}</span>
                    <span className="et-level-label">{arabic ? "من التقرير الأصلي" : "From the source report"}</span>
                  </div>
                  <strong dir="auto">{card.pivot}</strong>
                </section>
              )}
              {text.watchText && (
                <section className="et-detail-watch">
                  <span className="et-section-label">{arabic ? "ما الذي يطلب التقرير مراقبته؟" : "What the report says to watch"}</span>
                  <p dir={translated ? "rtl" : "auto"}>{text.watchText}</p>
                </section>
              )}
              {text.preference && (
                <section className="et-detail-section et-detail-section--primary">
                  <span className="et-section-label">{arabic ? "السيناريو المفضل في التقرير" : "Our preference"}</span>
                  <p dir={translated ? "rtl" : "auto"}>{text.preference}</p>
                </section>
              )}
              {text.alternative && (
                <section className="et-detail-section">
                  <span className="et-section-label">{arabic ? "السيناريو البديل" : "Alternative scenario"}</span>
                  <p dir={translated ? "rtl" : "auto"}>{text.alternative}</p>
                </section>
              )}
              {text.comment && (
                <section className="et-detail-section et-detail-section--comment">
                  <span className="et-section-label">{arabic ? "تعليق المحلل في المصدر" : "Analyst commentary"}</span>
                  <p dir={translated ? "rtl" : "auto"}>{text.comment}</p>
                </section>
              )}
              {translated && translation?.extraAnalysis && (
                <section className="et-detail-section et-detail-section--ai">
                  <span className="et-section-label">قراءة إضافية مبنية على نص التقرير</span>
                  <p>{translation.extraAnalysis}</p>
                </section>
              )}
              {translated && (
                <details className="et-original-source">
                  <summary>عرض نص Trading Central الأصلي دون ترجمة</summary>
                  {card.watchText && <div><b>ما الذي نراقبه؟</b><p dir="auto">{card.watchText}</p></div>}
                  {card.preference && <div><b>السيناريو المفضل</b><p dir="auto">{card.preference}</p></div>}
                  {card.alternative && <div><b>السيناريو البديل</b><p dir="auto">{card.alternative}</p></div>}
                  {card.comment && <div><b>تعليق المصدر</b><p dir="auto">{card.comment}</p></div>}
                </details>
              )}
              <section className="et-source-meta" aria-label="Source report information">
                {translatedSubject && arabic && <div className="et-meta-item"><span>عنوان البريد بالعربية</span><strong>{translatedSubject}</strong></div>}
                {meta.subject && <div className="et-meta-item"><span>{arabic ? "عنوان البريد الأصلي" : "Email subject"}</span><strong>{meta.subject}</strong></div>}
                {meta.session && <div className="et-meta-item"><span>{arabic ? "الجلسة" : "Session"}</span><strong>{arabic ? translatedSession || meta.session : meta.session}</strong></div>}
                {meta.date && <div className="et-meta-item"><span>{arabic ? "تاريخ التقرير" : "Report date"}</span><strong>{meta.date}</strong></div>}
                {rec && <div className="et-meta-item"><span>{arabic ? "وقت الاستلام" : "Received"}</span><strong>{rec}</strong></div>}
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
