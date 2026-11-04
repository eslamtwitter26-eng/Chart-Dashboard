import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { ChartBlock, Direction } from "./DailyCard";
import { report } from "./data";
import type { AssetCard, EmailData } from "./types";
import "./_group.css";
import "./enhanced.css";

function AnalysisCard({ card, index, onExpand }: {
  card: AssetCard;
  index: number;
  onExpand: (card: AssetCard, element: HTMLElement) => void;
}) {
  return (
    <article className={`et-card dc--${card.direction}`} style={{ animationDelay: `${index * 45}ms` }}>
      <header className="et-card-header">
        <span className="et-index">{String(index + 1).padStart(2, "0")}</span>
        <div className="et-identity">
          <h2>{card.assetName}</h2>
          <p>Intraday · {card.timeframe || "Timeframe not specified"}</p>
        </div>
        <Direction dir={card.direction} />
        <button className="et-expand" onClick={event => onExpand(card, event.currentTarget)}
          aria-label={`Expand full ${card.assetName} analysis`}>
          Full analysis <Maximize2 size={12} />
        </button>
      </header>

      <div className="et-chart"><ChartBlock card={card} /></div>

      <div className="et-levels">
        {card.pivot && (
          <div className="et-level">
            <span className="et-level-label">Pivot · key level</span>
            <strong>{card.pivot}</strong>
          </div>
        )}
        {card.watchText && (
          <div className="et-watch">
            <span className="et-level-label">Watch from report</span>
            <p>{card.watchText}</p>
          </div>
        )}
      </div>

      <div className="et-scenarios">
        {card.preference && (
          <section className="et-scenario">
            <span className="et-section-label">Our preference</span>
            <p>{card.preference}</p>
          </section>
        )}
        {card.alternative && (
          <section className="et-scenario et-scenario--alternative">
            <span className="et-section-label">Alternative scenario</span>
            <p>{card.alternative}</p>
          </section>
        )}
      </div>

      {card.comment && (
        <section className="et-comment">
          <span className="et-section-label">Trading Central commentary</span>
          <p>{card.comment}</p>
        </section>
      )}

      <footer className="et-card-footer">
        <span className="et-source-label"><i className="et-source-mark" />Trading Central · {report.session}</span>
        <span>{report.date}</span>
      </footer>
    </article>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

function AnalysisDetail({ card, meta, style, returnTo, onClose }: {
  card: AssetCard;
  meta: Pick<EmailData, "subject" | "session" | "date" | "receivedAt">;
  style: React.CSSProperties;
  returnTo: HTMLElement | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>(".et-close")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); closeHandler.current(); return; }
      if (event.key !== "Tab" || !dialog.current) return;
      const controls = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
      returnTo?.focus();
    };
  }, [returnTo]);

  const received = meta.receivedAt
    ? (Number.isNaN(Date.parse(meta.receivedAt)) ? meta.receivedAt : new Date(meta.receivedAt).toLocaleString())
    : "";

  return (
    <div className="et-scrim" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialog} className={`et-dialog dc--${card.direction}`} style={style}
        role="dialog" aria-modal="true" aria-labelledby="et-dialog-title" data-testid="dialog-analysis-detail">
        <header className="et-dialog-head">
          <div className="et-dialog-head-main">
            <span className="et-section-label">Trading Central · {meta.session}</span>
            <h2 id="et-dialog-title">{card.assetName}</h2>
            <p>Intraday analysis · {card.timeframe || "Timeframe not specified"}</p>
          </div>
          <Direction dir={card.direction} />
          <button className="et-close" onClick={onClose} aria-label="Close analysis details">
            <X size={14} /> Close <kbd>Esc</kbd>
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
                  <div><span className="et-section-label">Pivot · key level</span><span className="et-level-label">From the source report</span></div>
                  <strong>{card.pivot}</strong>
                </section>
              )}
              {card.watchText && (
                <section className="et-detail-watch">
                  <span className="et-section-label">What the report says to watch</span>
                  <p>{card.watchText}</p>
                </section>
              )}
              {card.preference && (
                <section className="et-detail-section et-detail-section--primary">
                  <span className="et-section-label">Our preference</span>
                  <p>{card.preference}</p>
                </section>
              )}
              {card.alternative && (
                <section className="et-detail-section">
                  <span className="et-section-label">Alternative scenario</span>
                  <p>{card.alternative}</p>
                </section>
              )}
              {card.comment && (
                <section className="et-detail-section et-detail-section--comment">
                  <span className="et-section-label">Analyst commentary</span>
                  <p>{card.comment}</p>
                </section>
              )}
              <section className="et-source-meta" aria-label="Source report information">
                {meta.subject && <div className="et-meta-item"><span>Email subject</span><strong>{meta.subject}</strong></div>}
                {meta.session && <div className="et-meta-item"><span>Session</span><strong>{meta.session}</strong></div>}
                {meta.date && <div className="et-meta-item"><span>Report date</span><strong>{meta.date}</strong></div>}
                {received && <div className="et-meta-item"><span>Received</span><strong>{received}</strong></div>}
              </section>
              <p className="et-disclaimer">Source analysis reproduced from the Trading Central email. Scenarios can change and are not a guarantee or an individualized recommendation.</p>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AnalysisPage({ initialSelected = null }: { initialSelected?: AssetCard | null }) {
  const [selection, setSelection] = useState<{ card: AssetCard; trigger: HTMLElement | null } | null>(
    initialSelected ? { card: initialSelected, trigger: null } : null,
  );

  return (
    <div className="enhanced-shell">
      <header className="enhanced-toolbar">
        <strong className="enhanced-brand">DAILY ANALYSIS</strong>
        <span className="enhanced-toolbar-divider" />
        <span className="enhanced-session">{report.session}</span>
        <span className="enhanced-date">{report.date}</span>
        <span className="enhanced-spacer" />
        <span className="enhanced-source-state">Source checked just now</span>
        <button className="enhanced-refresh" type="button">Refresh</button>
      </header>
      <section className="enhanced-intro">
        <div>
          <span className="enhanced-eyebrow">Source report · Daily technical analysis</span>
          <h1>Session trade map</h1>
          <p>Pivot, watch level, preferred view, alternative scenario and the original chart from the report.</p>
        </div>
        <span className="enhanced-count">{report.cards.length} ASSETS</span>
      </section>
      <main className="enhanced-grid">
        {report.cards.map((card, index) => (
          <AnalysisCard key={card.id} card={card} index={index}
            onExpand={(selected, element) => setSelection({ card: selected, trigger: element })} />
        ))}
      </main>
      {selection && (
        <AnalysisDetail card={selection.card} meta={report} style={{}}
          returnTo={selection.trigger} onClose={() => setSelection(null)} />
      )}
    </div>
  );
}
