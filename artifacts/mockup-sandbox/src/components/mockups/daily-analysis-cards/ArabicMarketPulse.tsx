import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Layers3,
  Minus,
  Search,
  X,
} from "lucide-react";
import { report } from "./data";
import type { AssetCard } from "./types";
import "./_group.css";

type Bias = AssetCard["direction"];
type Filter = "all" | Bias;
type ReportTextKey = "watchText" | "preference" | "alternative" | "comment";
type CardTranslation = Pick<AssetCard, ReportTextKey>;

// Preview copy is intentionally separate from the immutable extracted report.
const mockTranslations: Record<string, CardTranslation> = {
  "gbp-usd": {
    watchText: "باتجاه 1.3498",
    preference: "تسود النظرة الصاعدة ما دام 1.3415 يشكل مستوى دعم، مع استهداف 1.3498 و1.3515.",
    alternative: "دون 1.3415، يُتوقع الوصول إلى 1.3387 ثم 1.3371.",
    comment: "مؤشر RSI فوق منطقة الحياد عند 50. ومؤشر MACD فوق خط الإشارة وفي المنطقة الإيجابية. يتحرك السعر فوق متوسطي 20 و50 فترة (عند 1.3439 و1.3426 على التوالي).",
  },
  "usd-jpy": {
    watchText: "تسود النظرة الهابطة ما دام 158.16 يشكل مقاومة",
    preference: "تسود النظرة الهابطة ما دام 158.16 يشكل مقاومة، مع استهداف 157.57 و157.45.",
    alternative: "فوق 158.16، تصبح المستويات 158.37 ثم 158.50 موضع متابعة.",
    comment: "مؤشر RSI دون منطقة الحياد عند 50. ومؤشر MACD دون خط الإشارة وفي المنطقة السلبية. الصورة الفنية سلبية، والسعر دون متوسطي 20 و50 فترة (عند 158.25 و158.22 على التوالي).",
  },
  "eur-usd": {
    watchText: "مراقبة 1.1274",
    preference: "تسود النظرة الصاعدة ما دام 1.1198 يشكل مستوى دعم، مع استهداف 1.1274 و1.1286.",
    alternative: "دون 1.1198، يُتوقع الوصول إلى 1.1178 ثم 1.1166.",
    comment: "مؤشر RSI فوق منطقة الحياد عند 50. ومؤشر MACD فوق خط الإشارة وفي المنطقة الإيجابية. يتحرك السعر فوق متوسطي 20 و50 فترة (عند 1.1218 و1.1201 على التوالي).",
  },
  ibex: {
    watchText: "مقاومة رئيسية عند 18,980.",
    preference: "تُفضّل المراكز البيعية دون 18980، مع أهداف عند 18660 و18521 في حال امتداد الحركة.",
    alternative: "فوق 18980، تُراقب مواصلة الصعود نحو 19080 و19160.",
    comment: "مؤشر RSI قريب من منطقة الحياد عند 50%.",
  },
  "crude-oil": {
    watchText: "حركة متذبذبة.",
    preference: "تُفضّل المراكز البيعية دون 100.00، مع أهداف عند 92.00 و90.00 في حال امتداد الحركة.",
    alternative: "فوق 100.00، تُراقب مواصلة الصعود نحو 102.00 و103.35.",
    comment: "قراءة مؤشر RSI متباينة وتميل إلى الهبوط.",
  },
  gold: {
    watchText: "تراجع مؤقت أم مواصلة للصعود؟",
    preference: "تسود النظرة الصاعدة ما دام 3,934 يشكل مستوى دعم، مع استهداف 4,049 و4,069.",
    alternative: "دون 3,934، يُتوقع الوصول إلى 3,901 ثم 3,881.",
    comment: "تقترب الأسعار حالياً من هدفنا الأول. إذا صمد هذا المستوى، فمن المرجح ظهور تراجع مؤقت؛ أما اختراقه بوضوح فقد يفتح المجال لمزيد من الصعود.",
  },
  "bitcoin-usd": {
    watchText: "الهدف الأول: مواصلة الحركة أم تماسك؟",
    preference: "الصورة الفنية غير واضحة بعض الشيء. فوق 75,836، يُراقب الصعود باتجاه 78,404.",
    alternative: "دون 75,836، تُراقب المستويات 75,049 و74,581.",
    comment: "الأسعار قريبة حالياً من هدفنا الأول. وقد يؤدي بلوغ هذا المستوى إلى تراجع مؤقت، بينما قد يساعد اختراقه بوضوح على دفع السعر إلى الأعلى.",
  },
  nvidia: {
    watchText: "ارتداد باتجاه 212.05",
    preference: "ارتداد فوق 204.43 باتجاه 212.05.",
    alternative: "دون 204.43، يُتوقع الوصول إلى 201.88 ثم 200.36.",
    comment: "مؤشر RSI دون منطقة الحياد عند 50. ومؤشر MACD فوق خط الإشارة لكنه سلبي. الصورة الفنية متباينة، والسعر دون متوسطي 20 و50 فترة (عند 206.68 و207.72 على التوالي).",
  },
};

function reportText(card: AssetCard, field: ReportTextKey, translated: boolean) {
  return translated ? mockTranslations[card.id][field] : card[field];
}

function resolveBias(card: AssetCard): Bias {
  const preference = card.preference.toLowerCase();
  if (/\b(short positions|downside prevails|sell below|bearish)\b/.test(preference)) return "bearish";
  if (/\b(long positions|buy above|upside prevails|bullish|rebound above)\b/.test(preference)) return "bullish";
  return card.direction;
}

function formatReceived(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function BiasMark({ bias, compact = false }: { bias: Bias; compact?: boolean }) {
  const Icon = bias === "bullish" ? ArrowUpLeft : bias === "bearish" ? ArrowDownLeft : Minus;
  const label = bias === "bullish" ? "صاعد" : bias === "bearish" ? "هابط" : "محايد";
  return (
    <span className={`amp-bias amp-bias--${bias}${compact ? " amp-bias--compact" : ""}`}>
      <Icon size={compact ? 13 : 14} strokeWidth={2.4} />
      {label}
    </span>
  );
}

function SourceChart({ card, large = false }: { card: AssetCard; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [card.chartUrl]);
  return (
    <div className={`amp-chart${large ? " amp-chart--large" : ""}`} dir="ltr">
      {failed ? (
        <div className="amp-chart-fallback">
          <BarChart3 size={22} />
          <span>تعذّر عرض مخطط المصدر</span>
        </div>
      ) : (
        <img src={card.chartUrl} alt={`${card.assetName} source chart`} onError={() => setFailed(true)} />
      )}
      <span className="amp-chart-stamp">TRADING CENTRAL · SOURCE CHART</span>
    </div>
  );
}

function SourceField({ label, value, kind = "", direction = "ltr" }: {
  label: string;
  value: string;
  kind?: string;
  direction?: "rtl" | "ltr";
}) {
  return (
    <section className={`amp-field ${kind}`}>
      <h4>{label}</h4>
      <p dir={direction}>{value}</p>
    </section>
  );
}

function DetailDialog({
  card,
  bias,
  translated,
  onClose,
}: {
  card: AssetCard;
  bias: Bias;
  translated: boolean;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="amp-scrim" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="amp-dialog" role="dialog" aria-modal="true" aria-labelledby="amp-dialog-title" dir="rtl">
        <header className="amp-dialog-head">
          <div className="amp-dialog-title">
            <span className="amp-kicker">تفاصيل التقرير · {card.timeframe}</span>
            <h2 id="amp-dialog-title" dir="ltr">{card.assetName}</h2>
          </div>
          <BiasMark bias={bias} />
          <button ref={closeButton} type="button" className="amp-close" onClick={onClose} aria-label="إغلاق التفاصيل">
            <X size={17} /><span>إغلاق</span><kbd>Esc</kbd>
          </button>
        </header>
        <div className="amp-dialog-scroll">
          <div className="amp-detail-grid">
            <div className="amp-detail-visual">
              <SourceChart card={card} large />
              <div className="amp-pivot amp-pivot--detail">
                <span>المحور السعري</span><strong dir="ltr">{card.pivot}</strong>
              </div>
            </div>
            <div className="amp-detail-copy">
              <SourceField label="نقطة المتابعة" value={reportText(card, "watchText", translated)} kind="amp-field--watch" direction={translated ? "rtl" : "ltr"} />
              <SourceField label="التفضيل الأساسي" value={reportText(card, "preference", translated)} direction={translated ? "rtl" : "ltr"} />
              <SourceField label="السيناريو البديل" value={reportText(card, "alternative", translated)} direction={translated ? "rtl" : "ltr"} />
              <SourceField label="تعليق المحلل" value={reportText(card, "comment", translated)} kind="amp-field--comment" direction={translated ? "rtl" : "ltr"} />
              <section className="amp-source-meta">
                <h3>بيانات مصدر التقرير</h3>
                <dl>
                  <dt><Layers3 size={13} /> الجلسة</dt><dd dir="ltr">{report.session}</dd>
                  <dt><CalendarDays size={13} /> تاريخ التقرير</dt><dd dir="ltr">{report.date}</dd>
                  <dt><Clock3 size={13} /> وقت الاستلام</dt><dd dir="ltr">{formatReceived(report.receivedAt)}</dd>
                </dl>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ArabicMarketPulse() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ card: AssetCard; bias: Bias } | null>(null);
  const [translationPreview, setTranslationPreview] = useState(true);

  const enriched = useMemo(
    () => report.cards.map((card) => ({ card, bias: resolveBias(card) })),
    [],
  );
  const counts = useMemo(() => enriched.reduce(
    (acc, item) => ({ ...acc, [item.bias]: acc[item.bias] + 1 }),
    { bullish: 0, bearish: 0, neutral: 0 },
  ), [enriched]);
  const visibleCards = useMemo(() => enriched.filter(({ card, bias }) => {
    const matchesFilter = filter === "all" || bias === filter;
    const matchesSearch = card.assetName.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  }), [enriched, filter, query]);
  const total = enriched.length;
  const bullishPercent = Math.round((counts.bullish / total) * 100);
  const bearishPercent = Math.round((counts.bearish / total) * 100);
  const indicatorCards = enriched.filter(({ card }) => /\b(RSI|MACD|moving average)\b/i.test(card.comment));
  const firstTargetCards = enriched.filter(({ card }) => /first target/i.test(card.comment));
  const alternativeCount = report.cards.filter((card) => Boolean(card.alternative)).length;

  return (
    <div className="amp-app" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .amp-app {
          --ink: #172b32; --ink-soft: #597077; --paper: #f3f5ef; --surface: #fffefa;
          --line: #dce4dc; --mint: #128568; --mint-pale: #e2f3eb; --coral: #c45c48;
          --coral-pale: #f9e9e3; --gold: #c18c30; --gold-pale: #f7f0dc;
          color: var(--ink); background: var(--paper); min-height: 100dvh; height: 100%;
          overflow: auto; font-family: 'IBM Plex Sans Arabic','DM Sans',sans-serif; position: relative;
          scrollbar-color: #a9c4b6 transparent;
        }
        .amp-app * { box-sizing: border-box; }
        .amp-app button, .amp-app input { font: inherit; }
        .amp-app button { color: inherit; }
        .amp-shell { max-width: 1390px; margin: 0 auto; padding: 0 42px 64px; }
        .amp-topbar { height: 68px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); }
        .amp-brand { display:flex; align-items:center; gap:11px; font-size:14px; font-weight:700; letter-spacing:-.02em; }
        .amp-brand-mark { width:34px;height:34px; border-radius:11px 11px 11px 3px; display:grid;place-items:center;color:#fff;background:var(--ink); }
        .amp-brand-name { display:flex; flex-direction:column; line-height:1.15; }
        .amp-brand-name small { font:500 9px 'IBM Plex Mono',monospace; letter-spacing:.08em; color:#859397; margin-top:4px; }
        .amp-top-meta { display:flex; align-items:center; gap:9px; color:var(--ink-soft); font-size:12px; }
        .amp-live-dot { width:7px;height:7px;border-radius:50%;background:#1b9a72;box-shadow:0 0 0 4px #1b9a7217; }
        .amp-report-label { padding:6px 10px; border:1px solid var(--line); border-radius:7px; color:var(--ink); background:#ffffff80; font-size:11px; }
        .amp-mode-control { display:flex;align-items:center;gap:2px;padding:3px;border:1px solid var(--line);border-radius:9px;background:#e9eee8; }
        .amp-mode-cluster { display:flex;align-items:center;gap:9px; }
        .amp-mode-control button { border:0;border-radius:6px;background:transparent;padding:6px 9px;color:#78898a;font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s,box-shadow .18s; }
        .amp-mode-control button[aria-pressed="true"] { background:var(--surface);color:#1b5144;box-shadow:0 1px 4px #24392e12; }
        .amp-source-cue { display:flex;align-items:center;gap:5px;color:#72847e;font-size:9px;white-space:nowrap; }
        .amp-source-cue svg { color:#168365; }
        .amp-hero { position:relative; padding:42px 0 28px; display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:28px; }
        .amp-hero:before { content:''; position:absolute; inset:18px auto auto -42px; width:190px;height:160px; pointer-events:none; opacity:.42; background:radial-gradient(ellipse at 30% 55%, #dbece0 0, #dbece000 70%); }
        .amp-eyebrow { display:flex;align-items:center;gap:9px;color:var(--mint);font-size:11px;font-weight:700;letter-spacing:.03em; }
        .amp-eyebrow-line { width:23px;height:1px;background:var(--mint); }
        .amp-hero h1 { margin:9px 0 7px; font-size:clamp(29px,4vw,48px); line-height:1.15; letter-spacing:-.055em; font-weight:700; }
        .amp-hero p { margin:0;color:var(--ink-soft);font-size:13px;line-height:1.9;max-width:690px; }
        .amp-hero-date { text-align:left; color:var(--ink-soft); font-size:11px; padding-bottom:5px;white-space:nowrap; }
        .amp-hero-date strong { display:block;color:var(--ink);font-weight:600;font-size:12px;margin-top:5px; }
        .amp-session-strip { display:flex;align-items:center;gap:10px; flex-wrap:wrap; margin-top:16px; }
        .amp-session-pill { display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:6px;background:#e6ede6;color:#38584e;font-size:10px;font-weight:600; }
        .amp-session-pill svg { color:var(--mint); }
        .amp-time-meta { color:#879397;font-size:10px; }
        .amp-overview { display:grid;grid-template-columns:minmax(0,1.62fr) minmax(270px,.88fr);gap:16px;margin:6px 0 30px; }
        .amp-panel { background:var(--surface);border:1px solid var(--line);border-radius:14px; }
        .amp-sentiment { padding:19px 22px 17px; position:relative;overflow:hidden; }
        .amp-sentiment:after { content:'';position:absolute;left:-40px;top:-68px;width:170px;height:170px;border-radius:50%;border:1px solid #dce8df;box-shadow:0 0 0 16px #edf4ee,0 0 0 32px #f6f8f2;opacity:.65;pointer-events:none; }
        .amp-panel-heading { display:flex;justify-content:space-between;align-items:center;gap:12px;position:relative;z-index:1; }
        .amp-panel-heading h2 { margin:0;font-size:14px;letter-spacing:-.02em; }
        .amp-panel-heading span { color:#849194;font-size:10px; }
        .amp-sent-content { display:grid;grid-template-columns:1fr 165px;align-items:center;gap:26px;position:relative;z-index:1;margin-top:19px; }
        .amp-distribution { height:11px;background:#eff1eb;border-radius:20px;overflow:hidden;display:flex;direction:ltr; }
        .amp-distribution span { transition:width .45s ease; }
        .amp-distribution .bull { background:#239675; }.amp-distribution .bear { background:#ce7059; }.amp-distribution .neutral { background:#d7b45d; }
        .amp-legend { display:flex;gap:17px;flex-wrap:wrap;margin-top:14px; }
        .amp-legend button { display:flex;align-items:center;gap:6px;border:0;background:transparent;padding:3px 0;cursor:pointer;color:#65777a;font-size:11px;transition:opacity .2s,transform .2s; }
        .amp-legend button:hover { transform:translateY(-1px); }
        .amp-legend button[aria-pressed="false"] { opacity:.43; }
        .amp-legend i { width:7px;height:7px;border-radius:50%; }.amp-legend .bull-dot{background:#239675}.amp-legend .bear-dot{background:#ce7059}.amp-legend .neutral-dot{background:#d7b45d}
        .amp-count { color:var(--ink);font:600 12px 'IBM Plex Mono',monospace; }
        .amp-summary-ring { width:138px;height:138px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;background:conic-gradient(#239675 0deg ${bullishPercent * 3.6}deg,#ce7059 ${bullishPercent * 3.6}deg ${(bullishPercent + bearishPercent) * 3.6}deg,#d7b45d ${(bullishPercent + bearishPercent) * 3.6}deg 360deg); }
        .amp-summary-ring:before { content:'';position:absolute;inset:8px;background:var(--surface);border-radius:50%; }
        .amp-ring-copy { position:relative;text-align:center; }
        .amp-ring-copy strong { display:block;font:600 26px 'IBM Plex Mono',monospace;letter-spacing:-.06em; }
        .amp-ring-copy span { color:#879397;font-size:9px; }
        .amp-report-note { border-right:2px solid #cadbce;padding-right:12px;margin-top:16px;color:#78898a;font-size:10px;line-height:1.8;max-width:570px; }
        .amp-supplement { margin:0 0 28px;padding:15px 17px 16px;border:1px solid #d7e1d8;border-radius:12px;background:#eef3ec; }
        .amp-supplement-head { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px; }
        .amp-supplement-head h2 { margin:0;font-size:13px;letter-spacing:-.02em; }
        .amp-supplement-head p { margin:0;color:#7f908b;font-size:9px; }
        .amp-supplement-grid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px; }
        .amp-supplement-item { min-width:0;padding:11px 12px;border:1px solid #dce6dc;border-radius:8px;background:#fbfcf7; }
        .amp-supplement-item header { display:flex;align-items:center;justify-content:space-between;gap:8px;color:#658076;font-size:10px;font-weight:600; }
        .amp-supplement-item header strong { color:#22594a;font:600 11px 'IBM Plex Mono',monospace; }
        .amp-supplement-item p { margin:7px 0 0;color:#687b7a;font-size:10px;line-height:1.7; }
        .amp-supplement-tags { display:flex;flex-wrap:wrap;gap:5px;margin-top:7px; }
        .amp-supplement-tags span { border-radius:4px;background:#edf2ec;padding:3px 6px;color:#647a73;font:500 8px 'IBM Plex Mono',monospace; }
        .amp-readout { padding:19px 20px;display:flex;flex-direction:column;justify-content:space-between;min-height:194px;background:#e8efe8;border-color:#d9e4d9; }
        .amp-readout .amp-panel-heading span { color:#647c73; }
        .amp-readout-number { display:flex;align-items:baseline;gap:8px;margin:13px 0 5px; }
        .amp-readout-number strong { font:600 42px 'IBM Plex Mono',monospace;letter-spacing:-.08em;color:#17483d; }
        .amp-readout-number span { color:#668078;font-size:11px; }
        .amp-readout-copy { font-size:11px;line-height:1.8;color:#637b73; }
        .amp-readout-foot { display:flex;align-items:center;gap:6px;color:#527264;font-size:10px;border-top:1px solid #d4e0d6;padding-top:11px;margin-top:13px; }
        .amp-section-head { display:flex;align-items:end;justify-content:space-between;gap:16px;margin:0 0 13px; }
        .amp-section-title { display:flex;align-items:baseline;gap:11px; }
        .amp-section-title h2 { margin:0;font-size:20px;letter-spacing:-.04em; }
        .amp-section-title span { color:#8a999a;font:500 10px 'IBM Plex Mono',monospace; }
        .amp-controls {display:flex;align-items:center;gap:8px;}
        .amp-search {height:36px;width:208px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid var(--line);background:#fffefa;border-radius:8px;color:#879397;}
        .amp-search input { width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--ink);font-size:11px; }
        .amp-search input::placeholder { color:#9aa6a6; }
        .amp-sort-button {height:36px;padding:0 11px;border:1px solid var(--line);border-radius:8px;background:#fffefa;display:flex;gap:8px;align-items:center;color:#6c7e80;font-size:10px;}
        .amp-card-grid {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;align-items:stretch;}
        .amp-card { min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;animation:amp-rise .48s both;transition:transform .22s,border-color .22s,box-shadow .22s; }
        .amp-card:hover { transform:translateY(-3px);border-color:#c4d4c9;box-shadow:0 12px 28px #334a3710; }
        .amp-card-top { display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:13px 14px 10px; }
        .amp-asset-title { min-width:0; }
        .amp-asset-title h3 { margin:0;font-size:14px;line-height:1.45;font-weight:700;letter-spacing:-.025em; }
        .amp-asset-title span { display:block;margin-top:3px;color:#8b999a;font:500 9px 'IBM Plex Mono',monospace;letter-spacing:.06em; }
        .amp-bias { display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:5px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap; }
        .amp-bias--bullish { color:#147b60;background:#e5f3eb; }.amp-bias--bearish { color:#b34e3c;background:#fae9e3; }.amp-bias--neutral { color:#99732c;background:#f6f0dd; }
        .amp-bias--compact { padding:4px 6px;font-size:9px; }
        .amp-chart { height:144px;position:relative;background:#f6f7f3;overflow:hidden;display:grid;place-items:center; }
        .amp-chart img { width:100%;height:100%;object-fit:contain;display:block; }
        .amp-chart-stamp { position:absolute;bottom:5px;left:7px;padding:3px 5px;border-radius:3px;background:#f8faf2d9;color:#84918a;font:500 7px 'IBM Plex Mono',monospace;letter-spacing:.06em; }
        .amp-chart--large {height:auto;min-height:310px;aspect-ratio:1.58;border-radius:9px;border:1px solid var(--line);}
        .amp-chart--large .amp-chart-stamp {font-size:8px;left:10px;bottom:8px;}
        .amp-chart-fallback {display:flex;align-items:center;gap:8px;color:#84918a;font-size:11px;}
        .amp-card-level {display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #edf0e9;}
        .amp-card-level span {color:#859394;font-size:10px;}.amp-card-level strong {font:600 12px 'IBM Plex Mono',monospace;background:#f0f3ed;border-radius:5px;padding:4px 7px;}
        .amp-card-snippet {padding:10px 14px 12px;flex:1;}
        .amp-card-snippet span {display:block;color:var(--mint);font-size:9px;font-weight:700;margin-bottom:5px;}
        .amp-card-snippet p {margin:0;color:#40585c;font-size:10px;line-height:1.75;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .amp-card-bottom {padding:9px 14px;border-top:1px solid #edf0e9;display:flex;align-items:center;justify-content:space-between;gap:8px;}
        .amp-card-bottom small {color:#9aa5a3;font-size:9px;}
        .amp-expand {border:0;background:transparent;color:#427568;display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:600;cursor:pointer;padding:4px 0;}
        .amp-expand:hover {color:#145a48;}
        .amp-empty {grid-column:1/-1;padding:46px 20px;text-align:center;border:1px dashed #cbd9ce;border-radius:12px;color:#768788;background:#fbfcf7;}
        .amp-empty strong {display:block;color:var(--ink);margin:8px 0 3px;font-size:13px;}
        .amp-empty p {margin:0;font-size:11px;}
        .amp-empty button {margin-top:13px;border:0;border-radius:7px;background:var(--ink);color:white;padding:8px 12px;font-size:10px;cursor:pointer;}
        .amp-footer {display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:22px;padding-top:15px;border-top:1px solid var(--line);color:#899798;font-size:9px;}
        .amp-footer-brand {display:flex;align-items:center;gap:7px;}.amp-footer-brand svg{color:var(--mint);}
        .amp-scrim {position:fixed;inset:0;z-index:80;background:#132a2bb3;backdrop-filter:blur(5px);display:grid;place-items:center;padding:22px;animation:amp-fade .2s both;}
        .amp-dialog {width:min(1060px,100%);max-height:min(90dvh,900px);background:var(--paper);border-radius:16px;overflow:hidden;box-shadow:0 30px 100px #102a2a40;display:flex;flex-direction:column;animation:amp-dialog-in .28s both;}
        .amp-dialog-head {display:flex;align-items:center;gap:16px;padding:18px 23px;border-bottom:1px solid var(--line);background:var(--surface);}
        .amp-dialog-title {flex:1;min-width:0;}.amp-dialog-title h2{margin:2px 0 0;font-size:23px;letter-spacing:-.05em;}
        .amp-kicker {color:#899798;font-size:9px;}
        .amp-close {display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:7px;background:#fffefa;padding:7px 9px;color:#65777a;font-size:10px;cursor:pointer;}
        .amp-close kbd {font:9px 'IBM Plex Mono',monospace;color:#9aa5a3;background:#f0f2ed;border-radius:3px;padding:2px 4px;}
        .amp-dialog-scroll {overflow:auto;padding:20px 23px 25px;}
        .amp-detail-grid {display:grid;grid-template-columns:minmax(0,1.15fr) minmax(310px,.85fr);gap:20px;align-items:start;}
        .amp-detail-visual {position:sticky;top:0;}
        .amp-pivot {display:flex;align-items:center;justify-content:space-between;padding:12px 14px;margin-top:10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);}
        .amp-pivot span{color:#859394;font-size:10px;}.amp-pivot strong{font:600 15px 'IBM Plex Mono',monospace;color:#315a4d;}
        .amp-detail-copy {display:grid;gap:9px;}
        .amp-field {padding:12px 13px;border:1px solid var(--line);border-radius:8px;background:var(--surface);}
        .amp-field h4 {margin:0 0 6px;color:#849394;font-size:10px;font-weight:600;}
        .amp-field p {margin:0;color:#32484c;font:400 11px/1.8 'DM Sans',sans-serif;text-align:start;}
        .amp-field--watch {border-right:3px solid #d1ad52;background:#fffdf7;}
        .amp-field--comment p {color:#647678;}
        .amp-source-meta {padding:12px 13px;border:1px solid var(--line);border-radius:8px;background:#edf2eb;}
        .amp-source-meta h3{margin:0 0 9px;font-size:11px;}
        .amp-source-meta dl{display:grid;grid-template-columns:104px 1fr;gap:7px 10px;margin:0;font-size:10px;}
        .amp-source-meta dt{display:flex;align-items:center;gap:5px;color:#82918f;}.amp-source-meta dd{margin:0;color:#53686a;overflow-wrap:anywhere;}
        @keyframes amp-rise {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes amp-fade {from{opacity:0}to{opacity:1}}
        @keyframes amp-dialog-in {from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:1100px){.amp-shell{padding-inline:28px}.amp-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.amp-overview{grid-template-columns:minmax(0,1.35fr) minmax(250px,.85fr)}}
        @media(max-width:760px){
          .amp-shell{padding:0 17px 42px}.amp-topbar{height:59px}.amp-top-meta{font-size:10px}.amp-report-label{display:none}
          .amp-topbar { height:auto;min-height:60px;padding:8px 0;gap:9px;flex-wrap:wrap; }
          .amp-top-meta { margin-inline-start:auto; }
          .amp-mode-control { order:3;width:100%;justify-content:space-between; }
          .amp-mode-cluster { order:3;width:100%;justify-content:space-between; }
          .amp-mode-control button { flex:1; }
          .amp-source-cue { font-size:8px; }
          .amp-hero{grid-template-columns:1fr;padding:30px 0 20px;gap:10px}.amp-hero:before{left:-18px}.amp-hero h1{font-size:34px}.amp-hero p{font-size:12px}.amp-hero-date{text-align:right;display:flex;align-items:center;gap:8px;font-size:10px}.amp-hero-date strong{margin:0}
          .amp-overview{grid-template-columns:1fr;gap:10px;margin-bottom:25px}.amp-sentiment{padding:16px}.amp-sent-content{grid-template-columns:1fr 106px;gap:14px}.amp-summary-ring{width:96px;height:96px}.amp-summary-ring:before{inset:6px}.amp-ring-copy strong{font-size:21px}.amp-legend{gap:12px}.amp-legend button{font-size:10px}
          .amp-readout{min-height:0;padding:15px 16px}.amp-readout-number{margin:5px 0}.amp-readout-number strong{font-size:34px}.amp-readout-foot{margin-top:9px;padding-top:9px}
          .amp-section-head{align-items:flex-start;flex-direction:column;margin-bottom:11px}.amp-section-title h2{font-size:18px}.amp-controls{width:100%}.amp-search{flex:1;width:auto}.amp-sort-button{white-space:nowrap}
          .amp-card-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.amp-card-top{padding:11px 10px 9px}.amp-asset-title h3{font-size:12px}.amp-bias{font-size:8px;padding:4px 6px}.amp-chart{height:118px}.amp-card-level{padding:8px 10px}.amp-card-snippet{padding:9px 10px 10px}.amp-card-bottom{padding:8px 10px}.amp-card-snippet p{font-size:9px}
          .amp-supplement {padding:13px 12px;margin-bottom:23px}.amp-supplement-head{align-items:flex-start;flex-direction:column;gap:4px}.amp-supplement-grid{grid-template-columns:1fr;gap:7px}.amp-supplement-item{padding:9px 10px}.amp-supplement-item p{margin-top:4px}
          .amp-footer{align-items:flex-start;flex-direction:column}.amp-scrim{padding:0;align-items:end}.amp-dialog{width:100%;max-height:94dvh;border-radius:16px 16px 0 0}.amp-dialog-head{padding:15px 16px;gap:9px}.amp-dialog-title h2{font-size:20px}.amp-close{padding:7px}.amp-close kbd{display:none}.amp-dialog-scroll{padding:14px 15px 24px}.amp-detail-grid{grid-template-columns:1fr;gap:12px}.amp-detail-visual{position:static}.amp-chart--large{min-height:220px}.amp-detail-copy{gap:8px}
        }
        @media(max-width:390px){.amp-shell{padding-inline:12px}.amp-brand{font-size:12px}.amp-top-meta{gap:7px}.amp-sent-content{grid-template-columns:1fr 84px;gap:10px}.amp-summary-ring{width:80px;height:80px}.amp-card-grid{gap:8px}.amp-chart{height:103px}.amp-card-top{gap:4px}.amp-asset-title h3{font-size:11px}.amp-bias{gap:2px;padding:4px}.amp-card-bottom small{font-size:8px}}
        @media(prefers-reduced-motion:reduce){.amp-app *, .amp-app *:before, .amp-app *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
      `}</style>
      <div className="amp-shell">
        <header className="amp-topbar">
          <div className="amp-brand">
            <span className="amp-brand-mark"><BarChart3 size={18} strokeWidth={2.2} /></span>
            <span className="amp-brand-name">EG-Finance FX<small>TRADING CENTRAL</small></span>
          </div>
          <div className="amp-mode-cluster">
            <div className="amp-mode-control" role="group" aria-label="لغة نص التقرير">
              <button type="button" aria-pressed={translationPreview} onClick={() => setTranslationPreview(true)}>معاينة عربية</button>
              <button type="button" aria-pressed={!translationPreview} onClick={() => setTranslationPreview(false)}>النص الأصلي · English</button>
            </div>
            <span className="amp-source-cue"><Check size={12} /> {translationPreview ? "ترجمة معاينة · المصدر محفوظ" : "النص الأصلي محفوظ كما ورد"}</span>
          </div>
          <div className="amp-top-meta"><span className="amp-live-dot" /><span>قراءة تقرير السوق</span><span className="amp-report-label">تقارير التحليل الفني</span></div>
        </header>

        <main>
          <section className="amp-hero">
            <div>
              <div className="amp-eyebrow"><span className="amp-eyebrow-line" /> موجز افتتاح الجلسة</div>
              <h1>نبض السوق <span style={{ color: "#178267" }}>اليومي</span></h1>
              <p>امسح المشهد بسرعة، ثم افتح تفاصيل كل أداة لقراءة سيناريوهات Trading Central ومستوياتها كما وردت في التقرير.</p>
              <div className="amp-session-strip">
                <span className="amp-session-pill"><Layers3 size={13} /> {report.session}</span>
                <span className="amp-time-meta">تقرير واحد · {total} أدوات</span>
                <span className="amp-time-meta" dir="ltr">{formatReceived(report.receivedAt)}</span>
              </div>
            </div>
            <div className="amp-hero-date"><CalendarDays size={14} /> تاريخ التقرير <strong dir="ltr">{report.date}</strong></div>
          </section>

          <section className="amp-overview" aria-label="نظرة على اتجاهات التقرير">
            <div className="amp-panel amp-sentiment">
              <div className="amp-panel-heading"><h2>قراءة الاتجاهات</h2><span>توصيات التقرير الحالي فقط</span></div>
              <div className="amp-sent-content">
                <div>
                  <div className="amp-distribution" role="img" aria-label={`${counts.bullish} صاعد، ${counts.bearish} هابط، ${counts.neutral} محايد`}>
                    <span className="bull" style={{ width: `${counts.bullish / total * 100}%` }} />
                    <span className="bear" style={{ width: `${counts.bearish / total * 100}%` }} />
                    <span className="neutral" style={{ width: `${counts.neutral / total * 100}%` }} />
                  </div>
                  <div className="amp-legend">
                    <button type="button" aria-pressed={filter === "bullish"} onClick={() => setFilter(filter === "bullish" ? "all" : "bullish")}><i className="bull-dot" /> صاعد <span className="amp-count">{counts.bullish}</span></button>
                    <button type="button" aria-pressed={filter === "bearish"} onClick={() => setFilter(filter === "bearish" ? "all" : "bearish")}><i className="bear-dot" /> هابط <span className="amp-count">{counts.bearish}</span></button>
                    <button type="button" aria-pressed={filter === "neutral"} onClick={() => setFilter(filter === "neutral" ? "all" : "neutral")}><i className="neutral-dot" /> محايد <span className="amp-count">{counts.neutral}</span></button>
                  </div>
                  <div className="amp-report-note">التصنيف مستخلص من نص التفضيل الأصلي لكل أداة، وليس مقياساً لتمركز السوق أو بيانات لحظية.</div>
                </div>
                <div className="amp-summary-ring" aria-hidden="true"><div className="amp-ring-copy"><strong>{total}</strong><span>أداة في التقرير</span></div></div>
              </div>
            </div>
            <aside className="amp-panel amp-readout">
              <div className="amp-panel-heading"><h2>خريطة التوصيات</h2><span>من التقرير</span></div>
              <div>
                <div className="amp-readout-number"><strong>{bullishPercent}<small style={{ fontSize: 17 }}>%</small></strong><span>من الأدوات تحمل تفضيلاً صاعداً</span></div>
                <div className="amp-readout-copy">قارن التفضيل الأساسي بالسيناريو البديل ومستوى المحور قبل اتخاذ قرارك.</div>
              </div>
              <div className="amp-readout-foot"><Check size={13} /> جميع القراءات مرتبطة بهذا التقرير فقط</div>
            </aside>
          </section>

          <section className="amp-supplement" aria-labelledby="amp-supplement-title">
            <div className="amp-supplement-head">
              <h2 id="amp-supplement-title">ملاحظات إضافية من نص التقرير</h2>
              <p>استخلاص تحريري من الحقول الأصلية فقط · لا بيانات سوق مباشرة</p>
            </div>
            <div className="amp-supplement-grid">
              <article className="amp-supplement-item">
                <header><span>إشارات فنية في التعليقات</span><strong>{indicatorCards.length} أدوات</strong></header>
                <p>تذكر التعليقات RSI أو MACD أو المتوسطات المتحركة صراحةً.</p>
                <div className="amp-supplement-tags">{indicatorCards.map(({ card }) => <span key={card.id}>{card.assetName}</span>)}</div>
              </article>
              <article className="amp-supplement-item">
                <header><span>ذكر الاقتراب من الهدف الأول</span><strong>{firstTargetCards.length} أدوات</strong></header>
                <p>هذه الملاحظة واردة في تعليق المصدر، وليست قراءة سعر لحظية.</p>
                <div className="amp-supplement-tags">{firstTargetCards.map(({ card }) => <span key={card.id}>{card.assetName}</span>)}</div>
              </article>
              <article className="amp-supplement-item">
                <header><span>تغطية السيناريو البديل</span><strong>{alternativeCount} / {total}</strong></header>
                <p>لكل أداة نص سيناريو بديل ضمن التقرير المستخرج.</p>
              </article>
            </div>
          </section>

          <section aria-labelledby="amp-assets-title">
            <div className="amp-section-head">
              <div className="amp-section-title"><h2 id="amp-assets-title">الأدوات المشمولة</h2><span>{visibleCards.length} / {total}</span></div>
              <div className="amp-controls">
                <label className="amp-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن أداة..." aria-label="ابحث عن أداة" /></label>
                <button className="amp-sort-button" type="button" onClick={() => setFilter("all")} aria-label="إظهار جميع الأدوات">
                  {filter === "all" ? "كل الأدوات" : "إزالة التصفية"} <ChevronDown size={13} />
                </button>
              </div>
            </div>
            <div className="amp-card-grid">
              {visibleCards.length ? visibleCards.map(({ card, bias }, index) => (
                <article className="amp-card" key={card.id} style={{ animationDelay: `${index * 45}ms` }}>
                  <header className="amp-card-top">
                    <div className="amp-asset-title"><h3 dir="ltr">{card.assetName}</h3><span>{card.timeframe} · TC REPORT</span></div>
                    <BiasMark bias={bias} compact />
                  </header>
                  <SourceChart card={card} />
                  <div className="amp-card-level"><span>المحور السعري</span><strong dir="ltr">{card.pivot}</strong></div>
                  <div className="amp-card-snippet">
                    <span>{translationPreview ? "التفضيل الأساسي · ترجمة معاينة" : "التفضيل الأساسي · النص الأصلي"}</span>
                    <p dir={translationPreview ? "rtl" : "ltr"}>{reportText(card, "preference", translationPreview)}</p>
                  </div>
                  <footer className="amp-card-bottom">
                    <small>تحليل Trading Central</small>
                    <button type="button" className="amp-expand" onClick={() => setSelected({ card, bias })} aria-label={`عرض تفاصيل ${card.assetName}`}>
                      التفاصيل <ArrowLeft size={13} />
                    </button>
                  </footer>
                </article>
              )) : (
                <div className="amp-empty"><Search size={21} /><strong>لا توجد أدوات مطابقة</strong><p>جرّب اسماً آخر أو أزل التصفية الحالية.</p><button type="button" onClick={() => { setFilter("all"); setQuery(""); }}>عرض كل الأدوات</button></div>
              )}
            </div>
          </section>
        </main>
        <footer className="amp-footer">
          <span className="amp-footer-brand"><BarChart3 size={13} /> EG-Finance FX <span>·</span> قارئ تقارير Trading Central</span>
          <span>المحتوى التحليلي الأصلي باللغة الإنجليزية كما ورد في المصدر</span>
        </footer>
      </div>
      {selected && <DetailDialog card={selected.card} bias={selected.bias} translated={translationPreview} onClose={() => setSelected(null)} />}
    </div>
  );
}
