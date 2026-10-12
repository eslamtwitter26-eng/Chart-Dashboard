import { useEffect, useMemo, useRef, useState } from "react";
import pineSource from "../assets/analysis-schools.pine?raw";
import {
  ANALYSIS_SCHOOLS, analysisChartUrl, buildPineScript, normalizeSchool, pineFilename,
  type AnalysisChart, type AnalysisSchool,
} from "../lib/pine-analysis";
import "./pine-analysis-tools.css";

type CopyState = "idle" | "copied" | "error";

export function PineAnalysisTools({ charts, context }: { charts: AnalysisChart[]; context: string }) {
  const [open, setOpen] = useState(false);
  const [chartIdx, setChartIdx] = useState(0);
  const [school, setSchool] = useState<AnalysisSchool>("ICT");
  const [copy, setCopy] = useState<CopyState>("idle");
  const [downloadError, setDownloadError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLTextAreaElement>(null);
  const disabled = charts.length === 0;
  const chart = charts[Math.min(chartIdx, charts.length - 1)];

  const built = useMemo((): { code: string; error: string } => {
    try { return { code: buildPineScript(pineSource, school), error: "" }; }
    catch (e) { return { code: "", error: e instanceof Error ? e.message : "تعذّر تجهيز الكود." }; }
  }, [school]);

  useEffect(() => { if (chartIdx >= charts.length) setChartIdx(0); }, [charts.length, chartIdx]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { setCopy("idle"); }, [school]);

  const close = () => { setOpen(false); setCopy("idle"); setDownloadError(""); trigger.current?.focus(); };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation(); e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key === "Tab" && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), textarea, a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!node.contains(active)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  useEffect(() => { if (copy === "error") fallback.current?.select(); }, [copy]);

  const doCopy = async () => {
    if (!built.code) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(built.code);
      setCopy("copied");
    } catch { setCopy("error"); }
  };

  const doDownload = () => {
    if (!built.code) return;
    setDownloadError("");
    let url = "";
    try {
      url = URL.createObjectURL(new Blob([built.code], { type: "text/plain;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = pineFilename(school); a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
    } catch {
      setDownloadError("تعذّر تنزيل الملف. استخدم النسخ بدلًا من ذلك.");
    } finally {
      if (url) { const u = url; setTimeout(() => URL.revokeObjectURL(u), 1000); }
    }
  };

  const current = ANALYSIS_SCHOOLS.find(s => s.id === school);

  return (
    <div className="pine-tools-wrap">
      <button ref={trigger} className="dropdown-btn" aria-haspopup="dialog" aria-expanded={open}
        disabled={disabled} title={disabled ? "لا توجد شارتات معروضة" : undefined}
        data-testid={`button-pine-analysis-${context}`} onClick={() => setOpen(true)}>
        <span className="dropdown-label">Pine</span>
        <span className="dropdown-value">مدارس التحليل</span>
      </button>
      {open && chart && (
        <div className="pine-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
          <div ref={dialog} className="pine-dialog" role="dialog" aria-modal="true" dir="rtl" lang="ar"
            aria-labelledby={`pine-title-${context}`} data-testid={`dialog-pine-analysis-${context}`}>
            <header className="pine-head">
              <h2 id={`pine-title-${context}`}>تحليل المدارس عبر Pine على TradingView</h2>
              <button className="mini-btn" onClick={close} aria-label="إغلاق"
                data-testid={`button-close-pine-${context}`}>إغلاق</button>
            </header>

            <p className="pine-warn" role="note" data-testid={`text-pine-warning-${context}`}>
              <strong>تنبيه مهم:</strong> هذا الكود لا يُطبَّق مباشرة على شارتات هذا التطبيق، ولا يُنفَّذ أو يُترجَم داخل Replit.
              يعمل فقط على موقع tradingview.com بعد تسجيل الدخول.
            </p>

            <div className="pine-fields">
              <label>
                <span>الشارت</span>
                <select data-autofocus value={Math.min(chartIdx, charts.length - 1)} dir="ltr"
                  onChange={e => setChartIdx(Number(e.target.value))} data-testid={`select-pine-chart-${context}`}>
                  {charts.map((c, i) => <option key={`${c.symbol}-${c.interval}-${i}`} value={i}>{c.label}</option>)}
                </select>
              </label>
              <fieldset>
                <legend>المدرسة الافتراضية في الكود</legend>
                <div className="pine-schools">
                  {ANALYSIS_SCHOOLS.map(s => (
                    <label key={s.id} className={s.id === school ? "active" : ""}>
                      <input type="radio" name={`pine-school-${context}`} value={s.id} checked={s.id === school}
                        onChange={e => setSchool(normalizeSchool(e.target.value))}
                        data-testid={`radio-pine-school-${context}-${s.id.toLowerCase().replace(" ", "-")}`} />
                      <span dir="ltr">{s.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {current && <p className="pine-desc" data-testid={`text-pine-school-desc-${context}`}>{current.description}</p>}
            </div>

            {built.error ? (
              <p className="pine-error" role="alert" data-testid={`text-pine-build-error-${context}`}>{built.error}</p>
            ) : (
              <div className="pine-actions">
                <button className="pine-btn primary" onClick={doCopy} data-testid={`button-copy-pine-${context}`}>نسخ الكود</button>
                <button className="pine-btn" onClick={doDownload} data-testid={`button-download-pine-${context}`}>
                  تنزيل <span dir="ltr">{pineFilename(school)}</span>
                </button>
                <a className="pine-btn" href={analysisChartUrl(chart)} target="_blank" rel="noopener noreferrer"
                  data-testid={`link-open-tradingview-${context}`}>فتح الشارت في TradingView</a>
              </div>
            )}
            <div aria-live="polite" className="pine-status" data-testid={`status-pine-copy-${context}`}>
              {copy === "copied" && "تم نسخ الكود كاملًا."}
              {downloadError}
            </div>
            {copy === "error" && (
              <div className="pine-error" role="alert">
                <p>تعذّر النسخ تلقائيًا. حدّد الكود أدناه وانسخه يدويًا (Ctrl+C).</p>
                <textarea ref={fallback} readOnly dir="ltr" value={built.code} aria-label="كود Pine"
                  data-testid={`textarea-pine-fallback-${context}`} onFocus={e => e.currentTarget.select()} />
              </div>
            )}

            <ol className="pine-steps">
              <li>افتح الشارت في TradingView وسجّل الدخول.</li>
              <li>افتح Pine Editor وأنشئ مؤشرًا جديدًا (Indicator).</li>
              <li>احذف المحتوى الافتراضي والصق الكود كاملًا.</li>
              <li>احفظ ثم اضغط Add to chart.</li>
              <li>لتغيير المدرسة لاحقًا: إعدادات المؤشر ثم Inputs ثم Analysis school.</li>
            </ol>
            <p className="pine-note">
              الكشف قائم على قواعد ويعرض مرشحات وليس توصيات. موجات Elliott مبسّطة (موجة دافعة فقط)، وHarmonic يقتصر على Gartley وBat.
              نقاط الارتكاز (Pivots) تُؤكَّد بتأخير، لذلك تُرسم العلامات لاحقًا عند مواضع الارتكاز السابقة.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
