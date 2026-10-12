import { useEffect, useRef, useState } from "react";
import { INDICATORS, type IndicatorId } from "../lib/indicators";
import "./indicator-picker.css";

export function IndicatorPicker({ selected, onChange, context }: {
  selected: IndicatorId[]; onChange: (value: IndicatorId[]) => void; context: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open]);
  const toggle = (id: IndicatorId) => onChange(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]);
  const matches = INDICATORS.filter(item => `${item.label} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div ref={wrap} className="indicator-picker-wrap">
      <button ref={trigger} className="dropdown-btn" aria-haspopup="dialog" aria-expanded={open}
        data-testid={`button-indicators-${context}`} onClick={() => setOpen(value => !value)}>
        <span className="dropdown-label">Indicators</span>
        <span className="dropdown-value">{selected.length ? `${selected.length} active` : "None"}</span>
        <span className="dropdown-arrow" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="indicator-picker-panel" role="dialog" aria-label="Choose chart indicators">
          <div className="indicator-picker-heading">
            <strong>Technical indicators</strong>
            <button className="mini-btn" disabled={!selected.length} onClick={() => onChange([])}
              data-testid={`button-clear-indicators-${context}`}>Clear all</button>
          </div>
          <input ref={input} className="search-input" placeholder="Search RSI, MACD, moving average…"
            aria-label="Search indicators" data-testid={`input-search-indicators-${context}`}
            value={search} onChange={event => setSearch(event.target.value)} />
          <p className="indicator-picker-note">Select multiple indicators. Applies to all charts in this mode.</p>
          <div className="indicator-picker-list">
            {["Momentum", "Trend", "Volatility"].map(group => {
              const items = matches.filter(item => item.group === group);
              if (!items.length) return null;
              return (
                <fieldset key={group}>
                  <legend>{group}</legend>
                  {items.map(item => (
                    <label key={item.id} className="indicator-picker-option">
                      <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)}
                        data-testid={`checkbox-indicator-${context}-${item.id.split("@")[0]}`} />
                      <span><strong>{item.label}</strong><small>{item.name}</small></span>
                    </label>
                  ))}
                </fieldset>
              );
            })}
            {!matches.length && <p className="indicator-picker-note">No matching indicators.</p>}
          </div>
          <div className="indicator-picker-footer">
            <span>{selected.length} selected</span>
            <button className="mini-btn" data-testid={`button-done-indicators-${context}`}
              onClick={() => { setOpen(false); trigger.current?.focus(); }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
