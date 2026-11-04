import { useEffect, useState } from "react";
import { Maximize2, ImageOff, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AssetCard } from "./types";
import "./daily.css";
import "./analysis-redesign.css";

export function Direction({ dir }: { dir: AssetCard["direction"] }) {
  const Icon = dir === "bullish" ? TrendingUp : dir === "bearish" ? TrendingDown : Minus;
  return <span className={`dc-dir dc-dir--${dir}`}><Icon size={11} />{dir.toUpperCase()}</span>;
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
        <span>{card.chartUrl ? "Chart image failed to load" : "No chart in source email"}</span>
        {card.chartUrl && <a href={card.chartUrl} target="_blank" rel="noreferrer">Open image link</a>}
      </div>
    );
  }
  return (
    <div className={`dc-chart${large ? " dc-chart--large" : ""}`}>
      <img src={card.chartUrl} alt={`${card.assetName} chart`} onError={() => setErr(true)} />
    </div>
  );
}

export function DailyCard({ card, idx, onExpand }: { card: AssetCard; idx: number; onExpand: (c: AssetCard, el: HTMLElement) => void }) {
  return (
    <article className={`et-card dc--${card.direction}`} data-testid={`card-analysis-${card.id}`}
      style={{ animationDelay: `${idx * 45}ms` }}>
      <header className="et-card-header">
        <span className="et-index">{String(idx + 1).padStart(2, "0")}</span>
        <div className="et-identity">
          <h2>{card.assetName}</h2>
          <p>Intraday · {card.timeframe && card.timeframe !== "Not specified" ? card.timeframe : "Timeframe not specified"}</p>
        </div>
        <Direction dir={card.direction} />
        <button className="et-expand" data-testid={`button-expand-${card.id}`}
          aria-label={`Expand full ${card.assetName} analysis`}
          onClick={e => onExpand(card, e.currentTarget)}>
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
        <span className="et-source-label"><i className="et-source-mark" />Trading Central</span>
        <span>{card.timeframe || "Report analysis"}</span>
      </footer>
    </article>
  );
}
