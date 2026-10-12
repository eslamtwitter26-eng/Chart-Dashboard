import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { Palette, RotateCcw, X } from "lucide-react";

export interface DailyColors { preset: string; accent: string; bg: string; text: string }
interface Preset { id: string; name: string; accent: string; bg: string; text: string }

// Empty strings = follow the app theme.
export const PRESETS: Preset[] = [
  { id: "default", name: "App theme", accent: "", bg: "", text: "" },
  { id: "slate",   name: "Slate Blue", accent: "#5aa9ff", bg: "#141c2b", text: "#e3e9f4" },
  { id: "graphite",name: "Graphite Amber", accent: "#e0a53a", bg: "#1b1a18", text: "#ece7dc" },
  { id: "teal",    name: "Deep Teal", accent: "#3fc6b7", bg: "#0f2224", text: "#dcefed" },
  { id: "paper",   name: "Paper", accent: "#2f5fb3", bg: "#f6f2e8", text: "#1f2430" },
  { id: "mist",    name: "Mist Violet", accent: "#6d4fc4", bg: "#eceaf4", text: "#22202e" },
];
const KEY = "tdash-daily-colors-v1";
const DEFAULT: DailyColors = { preset: "default", accent: "", bg: "", text: "" };
const HEX = /^#[0-9a-fA-F]{6}$/;
const okColor = (v: unknown) => v === "" || (typeof v === "string" && HEX.test(v));

function read(): DailyColors {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "null");
    if (o && typeof o.preset === "string" && okColor(o.accent) && okColor(o.bg) && okColor(o.text)) return o;
  } catch { /* ignore */ }
  return DEFAULT;
}

export function useDailyColors() {
  const [colors, setColors] = useState<DailyColors>(read);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(colors)); } catch { /* ignore */ } }, [colors]);
  return { colors, setColors, reset: () => setColors(DEFAULT) };
}

export function colorVars(c: DailyColors): CSSProperties {
  const v: Record<string, string> = {};
  if (c.accent) v["--dc-accent"] = c.accent;
  if (c.bg) { v["--dc-bg"] = c.bg; v["--dc-bg-solid"] = "1"; }
  if (c.text) v["--dc-text"] = c.text;
  return v as CSSProperties;
}

function lum(hex: string) {
  const f = (i: number) => { const s = parseInt(hex.slice(i, i + 2), 16) / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5);
}
function contrast(a: string, b: string) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

export function ColorsPanel({ colors, setColors, reset }: {
  colors: DailyColors; setColors: (c: DailyColors) => void; reset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);

  const setCustom = useCallback((k: "accent" | "bg" | "text", v: string) => setColors({ ...colors, preset: "custom", [k]: v }), [colors, setColors]);
  const warn = colors.bg && colors.text && contrast(colors.bg, colors.text) < 4.5;

  const field = (k: "accent" | "bg" | "text", label: string) => (
    <label className="dcp-field">
      <span>{label}</span>
      <input type="color" data-testid={`input-color-${k}`} value={colors[k] || (k === "accent" ? "#3b9dff" : k === "bg" ? "#141c2b" : "#e3e9f4")}
        onChange={e => setCustom(k, e.target.value)} />
      <code>{colors[k] || "auto"}</code>
    </label>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="toolbar-icon-btn" data-testid="button-colors" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(o => !o)}>
        <Palette size={14} /> Colors
      </button>
      {open && (
        <div className="dcp" role="dialog" aria-label="Card colors">
          <div className="dcp-head"><b>Card colors</b>
            <button className="dcp-x" aria-label="Close colors" onClick={() => setOpen(false)}><X size={14} /></button></div>
          <div className="dcp-presets">
            {PRESETS.map(p => (
              <button key={p.id} data-testid={`button-preset-${p.id}`} aria-pressed={colors.preset === p.id}
                className={`dcp-preset${colors.preset === p.id ? " on" : ""}`}
                onClick={() => setColors({ preset: p.id, accent: p.accent, bg: p.bg, text: p.text })}>
                <span className="dcp-sw" style={{ background: p.bg || "hsl(var(--bg2))", borderColor: p.accent || "hsl(var(--primary))" }}>
                  <i style={{ background: p.accent || "hsl(var(--primary))" }} />
                  <i style={{ background: p.text || "hsl(var(--text))" }} />
                </span>{p.name}
              </button>
            ))}
          </div>
          <div className="dcp-sub">Custom</div>
          {field("accent", "Accent")}{field("bg", "Card background")}{field("text", "Text")}
          {warn && <div className="dcp-warn">Low contrast between background and text.</div>}
          <div className="dcp-note">Bullish / bearish colors are not affected.</div>
          <button className="mini-btn dcp-reset" data-testid="button-colors-reset" onClick={reset}><RotateCcw size={11} /> Reset to default</button>
        </div>
      )}
    </div>
  );
}
