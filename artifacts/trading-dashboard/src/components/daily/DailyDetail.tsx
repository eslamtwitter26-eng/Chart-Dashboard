import { useEffect, useRef } from "react";
import { X, Mail, Calendar, Clock, Layers } from "lucide-react";
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
    <div className="dd-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className={`dd dc--${card.direction}`} style={style} role="dialog" aria-modal="true"
        aria-labelledby="dd-title" data-testid="dialog-analysis-detail">
        <header className="dd-head">
          <div>
            <h2 id="dd-title">{card.assetName}</h2>
            <span className="dd-tf">{card.timeframe && card.timeframe !== "Not specified" ? card.timeframe : "Timeframe not specified"}</span>
          </div>
          <Direction dir={card.direction} />
          <button className="dd-close" data-testid="button-close-detail" onClick={onClose} aria-label="Close detail view"><X size={16} /> Close <kbd>Esc</kbd></button>
        </header>
        <div className="dd-scroll">
          <div className="dd-grid">
            <div className="dd-main">
              <ChartBlock card={card} large />
              {card.pivot && <div className="dc-pivot dc-pivot--big"><h4>Pivot</h4><p>{card.pivot}</p></div>}
            </div>
            <div className="dd-text">
              <Field label="Watch" value={card.watchText} tone="dc-field--watch" />
              <Field label="Our Preference" value={card.preference} />
              <Field label="Alternative Scenario" value={card.alternative} />
              <Field label="Comment" value={card.comment} tone="dc-field--comment" />
              <section className="dd-source" aria-label="Source email">
                <h4>Source email</h4>
                <dl>
                  {meta.subject && <><dt><Mail size={12} /> Subject</dt><dd>{meta.subject}</dd></>}
                  {meta.session && <><dt><Layers size={12} /> Session</dt><dd>{meta.session}</dd></>}
                  {meta.date && <><dt><Calendar size={12} /> Date</dt><dd>{meta.date}</dd></>}
                  {rec && <><dt><Clock size={12} /> Received</dt><dd>{rec}</dd></>}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
