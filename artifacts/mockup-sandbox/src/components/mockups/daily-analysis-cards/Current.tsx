import { useState } from "react";
import { DailyCard } from "./DailyCard";
import { DailyDetail } from "./DailyDetail";
import { report } from "./data";
import "./_group.css";

export function Current() {
  const [detail, setDetail] = useState<{ card: (typeof report.cards)[number]; el: HTMLElement } | null>(null);

  return (
    <div className="daily-preview">
      <header className="daily-preview-toolbar">
        <strong>DAILY ANALYSIS</strong>
        <span className="preview-session">{report.session}</span>
        <span className="preview-muted">{report.date}</span>
        <span className="preview-muted">{report.cards.length} assets</span>
        <span className="preview-spacer" />
        <span className="preview-muted">Checked just now</span>
        <button type="button">Refresh</button>
      </header>
      <main className="analysis-grid">
        {report.cards.map((card, index) => (
          <DailyCard key={card.id} card={card} idx={index}
            onExpand={(selected, element) => setDetail({ card: selected, el: element })} />
        ))}
      </main>
      {detail && (
        <DailyDetail card={detail.card} meta={report} style={{}} returnTo={detail.el}
          onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
