import { useEffect, useRef, useState } from "react";
import { LAYOUT_COUNTS, getLayouts, resolveLayout, type LayoutDef } from "../lib/layouts";

function layoutLabel(def: LayoutDef) {
  const names: Record<string, string> = {
    ml: "Large chart on the left", mr: "Large chart on the right",
    mt: "Large chart on top", mb: "Large chart on the bottom",
  };
  if (names[def.id]) return names[def.id];
  const [axis, sizes] = def.id.split(":");
  const parts = sizes.split(",").map(Number);
  if (parts.length === 1) return def.count === 1 ? "Single chart" : "Side by side";
  if (parts.every(n => n === 1)) return "Stacked vertically";
  return `${axis === "r" ? "Rows" : "Columns"} of ${parts.join(", ")} charts`;
}

function LayoutIcon({ def, size = 26 }: { def: LayoutDef; size?: number }) {
  const w = size, h = Math.round(size * 0.8), pad = 1.5;
  const cw = (w - pad * 2) / def.cols, ch = (h - pad * 2) / def.rows;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      {def.cells.map((c, i) => (
        <rect key={i} x={pad + (c.c - 1) * cw + 0.75} y={pad + (c.r - 1) * ch + 0.75}
          width={Math.max(1, c.cs * cw - 1.5)} height={Math.max(1, c.rs * ch - 1.5)}
          rx={1.5} fill="none" stroke="currentColor" strokeWidth={1.2} />
      ))}
    </svg>
  );
}

export function LayoutPicker({ count, layoutId, maxCount, onChange }: {
  count: number; layoutId: string; maxCount?: number;
  onChange: (count: number, layoutId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const current = resolveLayout(count, layoutId);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); }
    };
    document.addEventListener("mousedown", down);
    window.addEventListener("keydown", key, true);
    wrap.current?.querySelector<HTMLButtonElement>("[aria-checked='true']")?.focus();
    return () => { document.removeEventListener("mousedown", down); window.removeEventListener("keydown", key, true); };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = Array.from(wrap.current?.querySelectorAll<HTMLButtonElement>("[role='radio']") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (d: number) => { e.preventDefault(); items[(i + d + items.length) % items.length]?.focus(); };
    if (e.key === "ArrowRight" || e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(-1);
  };

  const counts = LAYOUT_COUNTS.filter(n => !maxCount || n <= maxCount || n === count);

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <button ref={btn} className="dropdown-btn" style={{ minWidth: 0 }} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`Chart layout: ${current.count} chart${current.count > 1 ? "s" : ""}`} onClick={() => setOpen(o => !o)}>
        <span className="dropdown-label">Layout</span>
        <span style={{ display: "flex", color: "hsl(var(--primary))" }}><LayoutIcon def={current} size={20} /></span>
        <span className="dropdown-value">{current.count}</span>
        <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dropdown-menu layout-picker" role="dialog" aria-label="Choose chart count and arrangement" onKeyDown={onMenuKey}>
          {counts.map(n => (
            <div key={n} className="layout-row" role="radiogroup" aria-label={`${n} chart${n > 1 ? "s" : ""}`}>
              <button type="button" className="layout-row-n"
                aria-label={`Choose ${n} charts`} aria-pressed={n === count}
                style={{ background: "transparent", border: 0, cursor: "pointer", color: n === count ? "hsl(var(--primary))" : undefined }}
                onClick={() => onChange(n, resolveLayout(n).id)}>{n}</button>
              <div className="layout-row-items">
                {getLayouts(n).map(def => {
                  const sel = def.count === current.count && def.id === current.id;
                  return (
                    <button key={def.id} role="radio" aria-checked={sel} className={`layout-opt ${sel ? "active" : ""}`}
                      title={layoutLabel(def)}
                      aria-label={`${n} chart${n > 1 ? "s" : ""}: ${layoutLabel(def)}`}
                      onClick={() => { onChange(n, def.id); setOpen(false); btn.current?.focus(); }}>
                      <LayoutIcon def={def} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
