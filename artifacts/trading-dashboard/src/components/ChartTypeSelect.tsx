import { normalizeChartType, type ChartType } from "../lib/chart-type";

export function ChartTypeSelect({ value, onChange, context }: {
  value: ChartType; onChange: (value: ChartType) => void; context: string;
}) {
  return (
    <label className="dropdown-btn" style={{ minWidth: 0, flexShrink: 0 }}>
      <span className="dropdown-label">Type</span>
      <select aria-label="Chart type" data-testid={`select-chart-type-${context}`}
        value={value} onChange={event => onChange(normalizeChartType(event.target.value))}
        style={{ background: "hsl(var(--bg2))", color: "hsl(var(--text))", border: 0, fontSize: 11, cursor: "pointer", padding: "2px 0", maxWidth: 110 }}>
        <option value="candles">Candles</option>
        <option value="line">Line</option>
      </select>
    </label>
  );
}
