import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { AssetCard, EmailData } from "./types";
import { ChartBlock, Direction, Field } from "./DailyCard";
import "./daily.css";

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function DailyDetail({ card, meta, style, returnTo, onClose }: {
  card: AssetCard; meta: Pick<EmailData, "subject" | "session" | "date" | "receivedAt">;
  style: React.CSSProperties; returnTo: HTMLElement | null; onClose: () => void;
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

  const rec = meta.receivedAt ? (isNaN(Date.parse(meta.receivedAt)) ? meta.receivedAt : new Date(meta.receivedAt).toLocaleString()) : "";

  return (
    <div className="et-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={box} className={`et-dialog dc--${card.direction}`} style={style} role="dialog" aria-modal="true"
        aria-labelledby="et-dialog-title" data-testid="dialog-analysis-detail">
        <header className="et-dialog-head">
          <div className="et-dialog-head-main">
            <span className="et-section-label">Trading Central · {meta.session}</span>
            <h2 id="et-dialog-title">{card.assetName}</h2>
            <p>Intraday analysis · {card.timeframe && card.timeframe !== "Not specified" ? card.timeframe : "Timeframe not specified"}</p>
          </div>
          <Direction dir={card.direction} />
          <button className="et-close" data-testid="button-close-detail" onClick={onClose} aria-label="Close analysis details">
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
                  <div>
                    <span className="et-section-label">Pivot · key level</span>
                    <span className="et-level-label">From the source report</span>
                  </div>
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
                {rec && <div className="et-meta-item"><span>Received</span><strong>{rec}</strong></div>}
              </section>
              <p className="et-disclaimer">
                Source analysis reproduced from the Trading Central email. Scenarios can change and are not a guarantee or an individualized recommendation.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
