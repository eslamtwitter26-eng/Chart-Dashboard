import { useEffect, useState } from "react";
import { Maximize2, ImageOff, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AssetCard } from "./types";
import "./daily.css";

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
    <article className={`dc dc--${card.direction}`} data-testid={`card-analysis-${card.id}`}
      style={{ animationDelay: `${0.03 + idx * 0.04}s` }}>
      <header className="dc-head">
        <span className="dc-idx">{String(idx + 1).padStart(2, "0")}</span>
        <div className="dc-title">
          <h3>{card.assetName}</h3>
          <span>{card.timeframe && card.timeframe !== "Not specified" ? card.timeframe : "Timeframe not specified"}</span>
        </div>
        <Direction dir={card.direction} />
        <button className="dc-expand" data-testid={`button-expand-${card.id}`} aria-label={`Expand ${card.assetName} analysis`}
          onClick={e => onExpand(card, e.currentTarget)}><Maximize2 size={13} /> Expand</button>
      </header>
      <ChartBlock card={card} />
      <div className="dc-body">
        {card.pivot && (
          <div className="dc-pivot"><h4>Pivot</h4><p>{card.pivot}</p></div>
        )}
        <Field label="Watch" value={card.watchText} tone="dc-field--watch" />
        <Field label="Our Preference" value={card.preference} />
        <Field label="Alternative Scenario" value={card.alternative} />
        <Field label="Comment" value={card.comment} tone="dc-field--comment" />
      </div>
    </article>
  );
}
