import { useEffect, useMemo, useRef, useState } from "react";
import { useGetGoldHistory, getGetGoldHistoryQueryKey, type GetGoldHistoryParams } from "@workspace/api-client-react";
import { GoldChartEngine } from "./engine";
import { goldTradingBars } from "./sessions";
import { INTERVALS, loadLevels, loadSettings, saveLevels, saveSettings, type GoldLevel, type GoldSettings } from "./storage";
import { detectICT } from "./ict";
import { candleCountdown } from "./countdown";
import type { ICTFeature, ICTZone, ICTLine } from "./ict-types";
import "./gold.css";

const ICT_BTNS: [ICTFeature, string][] = [
  ["fvg", "FVG"], ["orderBlock", "Order Block"], ["breaker", "Breaker"],
  ["structure", "BOS/CHoCH"], ["liquidity", "السيولة EQH/EQL"], ["premiumDiscount", "Premium/Discount"],
];
const ZONE_FEATURE: Record<ICTZone["kind"], ICTFeature> = { fvg: "fvg", orderBlock: "orderBlock", breaker: "breaker", premium: "premiumDiscount", discount: "premiumDiscount" };
const LINE_FEATURE: Record<ICTLine["kind"], ICTFeature> = { bos: "structure", choch: "structure", liquidity: "liquidity", equilibrium: "premiumDiscount" };
function latest<T extends { kind: string; formedAt: number }>(items: T[], n: number): T[] {
  const by = new Map<string, T[]>();
  for (const i of items) { const a = by.get(i.kind) ?? []; a.push(i); by.set(i.kind, a); }
  return [...by.values()].flatMap(a => a.sort((x, y) => y.formedAt - x.formedAt).slice(0, n));
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const utc = (d: Date) => Number.isNaN(d.getTime()) ? "—" : d.toISOString().replace("T", " ").slice(0, 16) + " UTC";

export function GoldLab({ theme }: { theme: "dark" | "light" }) {
  const [s, setS] = useState<GoldSettings>(loadSettings);
  const [levels, setLevels] = useState<GoldLevel[]>(loadLevels);
  const [price, setPrice] = useState("");
  const [lvErr, setLvErr] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const eng = useRef<GoldChartEngine | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => saveSettings(s), [s]);
  useEffect(() => saveLevels(levels), [levels]);

  const params = { interval: s.interval } as GetGoldHistoryParams;
  const q = useGetGoldHistory(params, {
    query: { queryKey: getGetGoldHistoryQueryKey(params), retry: false, staleTime: 120000, refetchInterval: 120000, refetchOnWindowFocus: false },
  });
  const data = q.data && q.data.interval === s.interval ? q.data : undefined;
  const bars = useMemo(() => data ? goldTradingBars(data.bars, s.interval) : undefined, [data, s.interval]);
  const hiddenSessionBars = data ? data.bars.length - (bars?.length ?? 0) : 0;
  const hasBars = !!bars && bars.length > 0;
  const errMsg = q.error
    ? ((q.error as { data?: { error?: string } }).data?.error ?? (q.error as Error).message ?? "تعذر جلب البيانات")
    : "";

  const colors = () => {
    const cs = getComputedStyle(document.documentElement);
    return { text: `hsl(${cs.getPropertyValue("--text2").trim()})`, grid: `hsl(${cs.getPropertyValue("--border").trim()})` };
  };
  useEffect(() => {
    if (!host.current) return;
    eng.current = new GoldChartEngine(host.current, colors());
    return () => { eng.current?.destroy(); eng.current = null; };
  }, []);
  useEffect(() => { eng.current?.setColors(colors()); }, [theme]);
  useEffect(() => {
    if (!eng.current) return;
    eng.current.update({ bars: bars ?? [], chartType: s.chartType, levels }, `${s.interval}:${data?.fetchedAt ? 1 : 0}`);
  }, [bars, data?.fetchedAt, s.chartType, s.interval, levels]);

  // Wall-clock expiry does not finalize an old intrabar snapshot. Confirm only
  // candles that had already closed when the provider response was fetched.
  const snapshotTime = data ? new Date(data.fetchedAt).getTime() : 0;
  const ict = useMemo(() => bars && bars.length ? detectICT(bars, s.interval, snapshotTime) : { zones: [], lines: [], closedBars: 0 }, [bars, s.interval, snapshotTime]);
  const shown = useMemo(() => ({
    zones: latest(ict.zones.filter(z => z.active && s.ict[ZONE_FEATURE[z.kind]]), 12),
    lines: latest(ict.lines.filter(l => s.ict[LINE_FEATURE[l.kind]] && (l.kind !== "liquidity" || l.active)), 12),
  }), [ict, s.ict]);
  useEffect(() => { eng.current?.setICT(shown.zones, shown.lines); }, [shown, bars, s.chartType]);

  const lastTime = hasBars ? bars![bars!.length - 1].time : undefined;
  useEffect(() => {
    const cd = candleCountdown(hasBars ? lastTime : undefined, s.interval, now);
    eng.current?.setCountdown(cd.text, cd.state, cd.remainingSeconds);
  }, [now, lastTime, hasBars, s.interval, bars, s.chartType]);

  const last = hasBars ? bars![bars!.length - 1] : undefined;
  const prev = hasBars && bars!.length > 1 ? bars![bars!.length - 2] : undefined;
  const delta = last && prev && prev.close !== 0 ? last.close - prev.close : undefined;

  const addLevel = () => {
    const p = Number(price.trim());
    if (!price.trim() || !Number.isFinite(p) || p <= 0) { setLvErr("أدخل سعراً صحيحاً أكبر من صفر"); return; }
    setLvErr("");
    setLevels(l => [...l, { id: `l${Date.now().toString(36)}${l.length}`, price: p }]);
    setPrice("");
  };
  const set = (p: Partial<GoldSettings>) => setS(x => ({ ...x, ...p }));
  const togIct = (k: ICTFeature) => setS(x => ({ ...x, ict: { ...x.ict, [k]: !x.ict[k] } }));
  const loading = q.isLoading || (q.isFetching && !data);

  return (
    <div className="gl" data-testid="gold-lab">
      <div className="gl-bar">
        <div className="gl-grp" data-testid="gold-interval" data-value={s.interval}>
          {INTERVALS.map(([v, l]) => (
            <button key={v} className={`gl-btn ${s.interval === v ? "on" : ""}`} data-testid={`gold-interval-${v}`} onClick={() => set({ interval: v })}>{l}</button>
          ))}
        </div>
        <div className="gl-grp" data-testid="gold-chart-type" data-value={s.chartType}>
          <button className={`gl-btn ${s.chartType === "candles" ? "on" : ""}`} data-testid="gold-chart-type-candles" onClick={() => set({ chartType: "candles" })}>شموع</button>
          <button className={`gl-btn ${s.chartType === "line" ? "on" : ""}`} data-testid="gold-chart-type-line" onClick={() => set({ chartType: "line" })}>خط (إغلاق)</button>
        </div>
        <button className="gl-btn" data-testid="gold-refresh" disabled={q.isFetching} onClick={() => q.refetch()}>{q.isFetching ? "جارٍ التحديث..." : "تحديث"}</button>
      </div>
      <div className="gl-ict" data-testid="gold-ict-bar">
        {ICT_BTNS.map(([k, l]) => (
          <button key={k} className={`gl-btn ${s.ict[k] ? "on" : ""}`} data-testid={`gold-ict-${k}`} aria-pressed={s.ict[k]} onClick={() => togIct(k)}>{l}</button>
        ))}
        <span className="gl-ict-count" data-testid="gold-ict-overlay" data-zones={shown.zones.length} data-lines={shown.lines.length} data-closed={ict.closedBars}>
          {hasBars ? (shown.zones.length + shown.lines.length ? `${shown.zones.length} مناطق · ${shown.lines.length} خطوط` : "لا إشارات مكتشفة") : ""}
        </span>
      </div>
      {errMsg && hasBars && (
        <div className="gl-warn" data-testid="gold-error" role="alert">
          <span>فشل آخر تحديث: {errMsg}. الشموع المعروضة قد تكون قديمة.</span>
          <button className="gl-btn" onClick={() => q.refetch()}>إعادة المحاولة</button>
        </div>
      )}
      <div className="gl-meta" data-testid="gold-data-status" data-state={loading ? "loading" : errMsg && !hasBars ? "error" : hasBars ? "ready" : "empty"} data-count={bars?.length ?? 0} data-interval={s.interval}>
        {data && hasBars ? (<>
          <span className="gl-quote">XAU/USD · آخر إغلاق <b>{fmt(last!.close)}</b></span>
          {delta !== undefined && <b style={{ color: `hsl(var(--${delta >= 0 ? "green" : "red"}))` }}>{delta >= 0 ? "+" : ""}{fmt(delta)}</b>}
        </>) : <span>لا توجد بيانات معروضة</span>}
        <details className="gl-details">
          <summary className="gl-btn" data-testid="gold-data-info">
            معلومات البيانات
            {!!data?.discardedBars && <span className="gl-info-flag" aria-label="تنبيه جودة البيانات"> • تنبيه</span>}
          </summary>
          <div className="gl-info-panel">
            <div className="gl-note" data-testid="gold-notice">
              أسعار مستقلة من Twelve Data قد تختلف عن TradingView. التحديث كل دقيقتين، وليس بثاً لحظياً؛ حتى 600 شمعة من المصدر. السعر بالدولار للأونصة.
            </div>
            <p>يُضغط المحور الزمني بإخفاء الشموع الواقعة بالكامل في عطلة نهاية الأسبوع المرجعية: الجمعة 17:00 إلى الأحد 18:00 بتوقيت نيويورك. قد تختلف ساعات الوسيط؛ لا تُحذف الشموع الهادئة أثناء الجلسة، ولا تُغيّر الأسعار.</p>
            {data && <>
              <p>وقت الجلب: <b>{utc(new Date(data.fetchedAt))}</b></p>
              {last && <p>افتتاح آخر شمعة معروضة: <b>{utc(new Date(last.time * 1000))}</b></p>}
              <p>عدد الشموع المعروضة: <b>{bars?.length ?? 0}</b> · المخفية خلال الإغلاق: <b data-testid="gold-hidden-session-bars">{hiddenSessionBars}</b></p>
              <p>قواعد ICT ميكانيكية وليست توصية أو ذكاءً اصطناعياً؛ تُحسب من الشموع التي أغلقت قبل آخر جلب للبيانات، لا من انتهاء الوقت وحده. تظهر المناطق النشطة من لحظة تأكيدها، بحد أقصى 12 لكل نوع، ولا تُرسم مناطق مملوءة أو ملغاة:</p>
              <ul>
                <li>FVG: فجوة ثلاث شموع مغلقة دون فجوات سعرية في السلسلة.</li>
                <li>BOS/CHoCH: كسر بإغلاق لقمة أو قاع محوري مؤكد بشمعتين من كل جانب.</li>
                <li>Order Block: جسم وذيل آخر شمعة معاكسة (من آخر 12) قبل اندفاع بقوة 0.6 من متوسط المدى الحقيقي لـ14.</li>
                <li>Breaker: Order Block فشل ثم أُعيد اختباره أو رُفض لاحقاً.</li>
                <li>السيولة: قمم أو قيعان متساوية ضمن 0.1 ATR.</li>
                <li>Premium/Discount: نطاق آخر قمة وقاع مؤكدين؛ المنتصف خط التوازن.</li>
                <li>يُعرض أحدث 12 عنصراً لكل ميزة. العد التنازلي يخص الشمعة الأخيرة.</li>
              </ul>
              {data.discardedBars > 0 && <div className="gl-warn" data-testid="gold-data-quality" role="status">{data.dataQualityNote}</div>}
            </>}
          </div>
        </details>
      </div>
      <div className="gl-wrap" data-testid="gold-chart" data-count={bars?.length ?? 0} data-interval={s.interval} data-chart-type={s.chartType}>
        <div className="gl-tools">
          <button className="gl-btn" onClick={() => eng.current?.fit()}>ملاءمة</button>
          <button className="gl-btn" onClick={() => eng.current?.zoom(0.7)}>+</button>
          <button className="gl-btn" onClick={() => eng.current?.zoom(1.4)}>−</button>
        </div>
        <div ref={host} className="gl-chart" />
        {loading && <div className="gl-over"><div className="gl-skel" /><span>جارٍ تحميل الشموع...</span></div>}
        {!loading && errMsg && !hasBars && (
          <div className="gl-over" data-testid="gold-error" role="alert">
            <b>تعذر جلب بيانات الذهب</b><span>{errMsg}</span>
            <button className="gl-btn" onClick={() => q.refetch()}>إعادة المحاولة</button>
          </div>
        )}
        {!loading && !errMsg && data && !hasBars && <div className="gl-over">{hiddenSessionBars > 0 ? "الشموع المتاحة تقع ضمن عطلة السوق؛ لا توجد شموع جلسة معروضة في هذا النطاق." : "لم يرجع المزود أي شموع لهذا الإطار"}</div>}
      </div>
      <div className="gl-lv">
        <span>خط سعر:</span>
        <input className="gl-in" data-testid="gold-price-input" inputMode="decimal" placeholder="2350.50" value={price}
          onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === "Enter" && addLevel()} />
        <button className="gl-btn" data-testid="gold-add-level" onClick={addLevel}>إضافة</button>
        {lvErr && <span style={{ color: "hsl(var(--red))" }} data-testid="gold-level-error">{lvErr}</span>}
        {levels.map(l => (
          <span key={l.id} className="gl-chip" data-testid={`gold-level-${l.id}`}>
            <b>{fmt(l.price)}</b>
            <button className="gl-btn" data-testid={`gold-delete-level-${l.id}`} aria-label="حذف الخط" onClick={() => setLevels(x => x.filter(y => y.id !== l.id))}>حذف</button>
          </span>
        ))}
      </div>
    </div>
  );
}
