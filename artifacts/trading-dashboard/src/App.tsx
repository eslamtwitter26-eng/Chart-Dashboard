import { useState, useCallback, useEffect, useRef, useMemo } from "react";

// ─── Types & Data ─────────────────────────────────────────────────────────────

type AssetGroup = "metals" | "indices" | "forex";
type DashMode   = "standard" | "custom";

interface Asset { symbol: string; label: string; group: AssetGroup }

const ASSET_GROUPS: { key: AssetGroup; label: string }[] = [
  { key: "metals",  label: "🏅 Metals & Commodities" },
  { key: "indices", label: "📈 Indices" },
  { key: "forex",   label: "💱 Forex" },
];

const ASSETS: Asset[] = [
  { symbol: "TVC:GOLD",        label: "Gold (XAU/USD)",  group: "metals"  },
  { symbol: "TVC:SILVER",      label: "Silver (XAG/USD)",group: "metals"  },
  { symbol: "NYMEX:CL1!",      label: "Oil WTI",         group: "metals"  },
  { symbol: "NYMEX:NG1!",      label: "Natural Gas",     group: "metals"  },
  { symbol: "COMEX:HG1!",      label: "Copper",          group: "metals"  },
  { symbol: "FOREXCOM:SPXUSD", label: "S&P 500",         group: "indices" },
  { symbol: "FOREXCOM:NSXUSD", label: "NASDAQ 100",      group: "indices" },
  { symbol: "FOREXCOM:DJI",    label: "Dow Jones",       group: "indices" },
  { symbol: "FOREXCOM:UKXGBP", label: "FTSE 100",        group: "indices" },
  { symbol: "XETR:DAX",        label: "DAX 40",          group: "indices" },
  { symbol: "TVC:NI225",       label: "Nikkei 225",      group: "indices" },
  { symbol: "TVC:HSI",         label: "Hang Seng",       group: "indices" },
  { symbol: "FX:EURUSD",       label: "EUR/USD",         group: "forex"   },
  { symbol: "FX:GBPUSD",       label: "GBP/USD",         group: "forex"   },
  { symbol: "FX:USDJPY",       label: "USD/JPY",         group: "forex"   },
  { symbol: "FX:USDCHF",       label: "USD/CHF",         group: "forex"   },
  { symbol: "FX:AUDUSD",       label: "AUD/USD",         group: "forex"   },
  { symbol: "FX:USDCAD",       label: "USD/CAD",         group: "forex"   },
  { symbol: "FX:NZDUSD",       label: "NZD/USD",         group: "forex"   },
  { symbol: "FX:GBPJPY",       label: "GBP/JPY",         group: "forex"   },
  { symbol: "FX:EURJPY",       label: "EUR/JPY",         group: "forex"   },
  { symbol: "FX:EURGBP",       label: "EUR/GBP",         group: "forex"   },
  { symbol: "FX:USDTRY",       label: "USD/TRY",         group: "forex"   },
  { symbol: "FX:USDZAR",       label: "USD/ZAR",         group: "forex"   },
];

interface Timeframe { interval: string; label: string; short: string }

const TIMEFRAMES: Timeframe[] = [
  { interval: "M",   label: "Monthly",    short: "1M"  },
  { interval: "W",   label: "Weekly",     short: "1W"  },
  { interval: "D",   label: "Daily",      short: "1D"  },
  { interval: "240", label: "4 Hours",    short: "4H"  },
  { interval: "60",  label: "1 Hour",     short: "1H"  },
  { interval: "30",  label: "30 Minutes", short: "30m" },
  { interval: "15",  label: "15 Minutes", short: "15m" },
  { interval: "5",   label: "5 Minutes",  short: "5m"  },
  { interval: "1",   label: "1 Minute",   short: "1m"  },
];

const ASSET_OPTS = ASSETS.map(a => ({ val: a.symbol, label: a.label, group: a.group }));
const TF_OPTS    = TIMEFRAMES.map(t => ({ val: t.interval, label: `${t.short}` }));

// ─── Custom slot ──────────────────────────────────────────────────────────────

interface CustomSlot { id: string; symbol: string; interval: string }

// ─── Saved template ───────────────────────────────────────────────────────────

interface SavedTemplate {
  id: string;
  name: string;
  mode: DashMode;
  createdAt: number;
  // Standard mode data
  stdSymbols?: string[];
  stdInterval?: string;
  stdCount?: number;
  // Custom mode data
  customSlots?: CustomSlot[];
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const KEY_STD       = "tdash-std-v3";
const KEY_CUSTOM    = "tdash-custom-v3";
const KEY_MODE      = "tdash-mode-v3";
const KEY_TEMPLATES = "tdash-templates-v3";

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function persist(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function loadTemplates(): SavedTemplate[] {
  return load<SavedTemplate[]>(KEY_TEMPLATES, []);
}
function saveTemplates(tpls: SavedTemplate[]) {
  persist(KEY_TEMPLATES, tpls);
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function getGrid(n: number) {
  if (n <= 1) return { cols: 1, rows: 1 };
  if (n === 2) return { cols: 2, rows: 1 };
  if (n === 3) return { cols: 3, rows: 1 };
  if (n === 4) return { cols: 2, rows: 2 };
  if (n <= 6)  return { cols: 3, rows: 2 };
  if (n <= 8)  return { cols: 4, rows: 2 };
  if (n <= 9)  return { cols: 3, rows: 3 };
  return { cols: 4, rows: 3 };
}

// ─── Uid ──────────────────────────────────────────────────────────────────────

let _id = Date.now();
const uid = () => `s${++_id}`;

// ─── TradingView chart ────────────────────────────────────────────────────────

function TvChart({ symbol, interval }: { symbol: string; interval: string }) {
  const src = useMemo(() => {
    const p = new URLSearchParams({
      symbol, interval,
      theme: "dark", style: "1", locale: "en",
      hide_top_toolbar: "1",
      hide_legend: "1",
      hide_side_toolbar: "1",
      allow_symbol_change: "0",
      save_image: "0",
      studies: "[]",
      withdateranges: "0",
      hidevolume: "1",
      hide_volume: "true",
      calendar: "0",
      news: "[]",
      no_referral_id: "1",
    });
    return `https://www.tradingview.com/widgetembed/?${p.toString()}`;
  }, [symbol, interval]);

  return (
    <iframe
      src={src}
      title={`${symbol}-${interval}`}
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      loading="lazy"
      style={{ width: "100%", height: "100%", border: "none", display: "block" }}
    />
  );
}

// ─── Dropdown hook ────────────────────────────────────────────────────────────

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return { open, setOpen, ref };
}

// ─── Asset multi-select dropdown ──────────────────────────────────────────────

function AssetDropdown({ selected, onChange }: { selected: string[]; onChange: (s: string[]) => void }) {
  const { open, setOpen, ref } = useDropdown();
  const [search, setSearch] = useState("");

  const filtered = ASSETS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (sym: string) =>
    onChange(selected.includes(sym) ? selected.filter(s => s !== sym) : [...selected, sym]);

  const label = selected.length === 0 ? "Select assets…"
    : selected.length === 1 ? (ASSETS.find(a => a.symbol === selected[0])?.label ?? "1 asset")
    : `${selected.length} assets`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="dropdown-btn" onClick={() => setOpen(o => !o)}>
        <span className="dropdown-label">Assets</span>
        <span className="dropdown-value" style={{ maxWidth: 140 }}>{label}</span>
        <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dropdown-menu" style={{ width: 265, maxHeight: 420 }}>
          <div style={{ padding: "8px 10px 6px" }}>
            <input className="search-input" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div style={{ display: "flex", gap: 6, padding: "2px 10px 8px", borderBottom: "1px solid hsl(var(--border))" }}>
            <button className="mini-btn" onClick={() => onChange(ASSETS.map(a => a.symbol))}>All</button>
            <button className="mini-btn" onClick={() => onChange([])}>Clear</button>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 310 }}>
            {ASSET_GROUPS.map(g => {
              const list = filtered.filter(a => a.group === g.key);
              if (!list.length) return null;
              return (
                <div key={g.key}>
                  <div className="asset-group-header">{g.label}</div>
                  {list.map(a => (
                    <label key={a.symbol} className="asset-option">
                      <input type="checkbox" checked={selected.includes(a.symbol)}
                        onChange={() => toggle(a.symbol)} style={{ accentColor: "hsl(210 100% 56%)" }} />
                      <span>{a.label}</span>
                    </label>
                  ))}
                </div>
              );
            })}
            {!filtered.length && <div style={{ padding: 14, fontSize: 12, color: "hsl(var(--muted))", textAlign: "center" }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple select ────────────────────────────────────────────────────────────

function SimpleSelect<T extends { label: string }>({
  label, options, value, onChange, displayFn,
}: {
  label: string; options: T[]; value: T;
  onChange: (v: T) => void; displayFn?: (v: T) => string;
}) {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="dropdown-btn" onClick={() => setOpen(o => !o)}>
        <span className="dropdown-label">{label}</span>
        <span className="dropdown-value">{displayFn ? displayFn(value) : value.label}</span>
        <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dropdown-menu" style={{ minWidth: 165 }}>
          {options.map((o, i) => (
            <button key={i} className={`dropdown-option ${o === value ? "active" : ""}`}
              onClick={() => { onChange(o); setOpen(false); }}>
              {displayFn ? displayFn(o) : o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Small inline select (for chart headers) ──────────────────────────────────

function InlineSelect({ value, options, onChange, grouped }: {
  value: string;
  options: { val: string; label: string; group?: string }[];
  onChange: (v: string) => void;
  grouped?: boolean;
}) {
  const { open, setOpen, ref } = useDropdown();
  const [search, setSearch] = useState("");

  const current = options.find(o => o.val === value);

  const filtered = options.filter(o =>
    !search || o.label.toLowerCase().includes(search.toLowerCase())
  );

  const groups = grouped
    ? (["metals", "indices", "forex"] as AssetGroup[])
    : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="inline-select-btn" onClick={() => { setOpen(o => !o); setSearch(""); }}>
        {current?.label ?? "—"}
        <span className="dropdown-arrow" style={{ marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dropdown-menu" style={{ minWidth: grouped ? 230 : 120, maxHeight: grouped ? 360 : 220, overflowY: "auto" }}>
          {grouped && (
            <div style={{ padding: "6px 8px 4px" }}>
              <input className="search-input" style={{ fontSize: 11 }} placeholder="Search…" value={search}
                onChange={e => setSearch(e.target.value)} autoFocus />
            </div>
          )}
          {groups
            ? groups.map(g => {
                const list = filtered.filter(o => o.group === g);
                if (!list.length) return null;
                const gLabel = ASSET_GROUPS.find(x => x.key === g)?.label ?? g;
                return (
                  <div key={g}>
                    <div className="asset-group-header">{gLabel}</div>
                    {list.map(o => (
                      <button key={o.val} className={`dropdown-option ${o.val === value ? "active" : ""}`}
                        onClick={() => { onChange(o.val); setOpen(false); }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                );
              })
            : filtered.map(o => (
                <button key={o.val} className={`dropdown-option ${o.val === value ? "active" : ""}`}
                  onClick={() => { onChange(o.val); setOpen(false); }}>
                  {o.label}
                </button>
              ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Templates panel ──────────────────────────────────────────────────────────

interface TemplatesPanelProps {
  templates: SavedTemplate[];
  onLoad: (t: SavedTemplate) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function TemplatesPanel({ templates, onLoad, onDelete, onClose }: TemplatesPanelProps) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}>
      <div style={{
        background: "hsl(var(--bg2))", border: "1px solid hsl(var(--border2))",
        borderRadius: 10, width: 420, maxHeight: "70vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px hsl(222 47% 4% / 0.9)",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--text))" }}>📁 Saved Templates</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(var(--muted))", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {templates.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "hsl(var(--muted))", fontSize: 13 }}>
              No saved templates yet.<br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>Use the Save button to save your current layout.</span>
            </div>
          ) : (
            templates.map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", borderBottom: "1px solid hsl(var(--border) / 0.4)",
                transition: "background 0.1s",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--text))", marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "hsl(var(--muted))" }}>
                    {t.mode === "standard"
                      ? `Standard · ${t.stdSymbols?.length ?? 0} assets · ${TIMEFRAMES.find(x => x.interval === t.stdInterval)?.short ?? t.stdInterval}`
                      : `Custom · ${t.customSlots?.length ?? 0} charts`}
                    {" · "}{new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button className="load-tpl-btn" onClick={() => onLoad(t)}>Load</button>
                <button className="del-tpl-btn" onClick={() => onDelete(t.id)} title="Delete">✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Save dialog ──────────────────────────────────────────────────────────────

function SaveDialog({ defaultName, onSave, onClose }: { defaultName: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.select(); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}>
      <div style={{
        background: "hsl(var(--bg2))", border: "1px solid hsl(var(--border2))",
        borderRadius: 10, width: 340, padding: "20px",
        boxShadow: "0 24px 60px hsl(222 47% 4% / 0.9)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--text))", marginBottom: 14 }}>💾 Save Template</div>
        <input
          ref={inputRef}
          className="search-input"
          style={{ fontSize: 13, padding: "8px 12px", marginBottom: 14 }}
          placeholder="Template name…"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) { onSave(name.trim()); } if (e.key === "Escape") onClose(); }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="mini-btn" style={{ padding: "6px 14px" }} onClick={onClose}>Cancel</button>
          <button
            style={{
              padding: "6px 18px", borderRadius: 6, border: "none",
              background: "hsl(var(--primary))", color: "white",
              fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: name.trim() ? 1 : 0.4,
            }}
            disabled={!name.trim()}
            onClick={() => onSave(name.trim())}
          >Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Count options ────────────────────────────────────────────────────────────

const COUNT_OPTS = Array.from({ length: 12 }, (_, i) => ({ label: `${i+1} chart${i > 0 ? "s" : ""}`, value: i+1 }));

// ─── Fullscreen hook ──────────────────────────────────────────────────────────

function useFullscreen() {
  const [fsIdx, setFsIdx] = useState<number | null>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setFsIdx(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return { fsIdx, setFsIdx };
}

// ─── Fullscreen overlay ───────────────────────────────────────────────────────

function FullscreenOverlay({
  symbol, interval, label, onExit,
}: { symbol: string; interval: string; label: string; onExit: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "hsl(var(--bg))",
      display: "flex", flexDirection: "column",
    }}>
      {/* mini bar */}
      <div style={{
        height: 32, minHeight: 32,
        display: "flex", alignItems: "center",
        padding: "0 12px", gap: 10,
        background: "hsl(var(--bg2))",
        borderBottom: "1px solid hsl(var(--border))",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--text))" }}>{label}</span>
        <span style={{ fontSize: 10, color: "hsl(var(--muted))", flex: 1 }}>Double-click or press ESC to exit</span>
        <button
          onClick={onExit}
          style={{
            padding: "2px 12px", borderRadius: 4,
            border: "1px solid hsl(var(--border2))",
            background: "hsl(var(--bg3))",
            color: "hsl(var(--text2))", fontSize: 11, fontWeight: 700,
          }}
        >✕ Exit</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }} onDoubleClick={onExit}>
        <TvChart symbol={symbol} interval={interval} />
      </div>
    </div>
  );
}

// ─── Standard mode ────────────────────────────────────────────────────────────

function StandardMode({
  templates, onSaveTemplate, onOpenTemplates,
}: {
  templates: SavedTemplate[];
  onSaveTemplate: (t: Omit<SavedTemplate, "id" | "createdAt">) => void;
  onOpenTemplates: () => void;
}) {
  const saved = load(KEY_STD, { symbols: ["TVC:GOLD","FOREXCOM:SPXUSD","FOREXCOM:NSXUSD","FX:EURUSD"], tfInterval: "D", count: 4 });
  const [symbols, setSymbols]   = useState<string[]>(saved.symbols);
  const [tf, setTf]             = useState<Timeframe>(TIMEFRAMES.find(t => t.interval === saved.tfInterval) ?? TIMEFRAMES[2]);
  const [countOpt, setCount]    = useState(COUNT_OPTS.find(o => o.value === saved.count) ?? COUNT_OPTS[3]);
  const [showSave, setShowSave] = useState(false);
  const { fsIdx, setFsIdx }     = useFullscreen();

  useEffect(() => { persist(KEY_STD, { symbols, tfInterval: tf.interval, count: countOpt.value }); }, [symbols, tf, countOpt]);

  const slots = useMemo(() =>
    symbols.map(s => ASSETS.find(a => a.symbol === s)).filter(Boolean).slice(0, countOpt.value) as Asset[],
    [symbols, countOpt.value]);

  const { cols, rows } = getGrid(Math.max(1, slots.length));

  const handleSave = (name: string) => {
    onSaveTemplate({ name, mode: "standard", stdSymbols: symbols, stdInterval: tf.interval, stdCount: countOpt.value });
    setShowSave(false);
  };

  return (
    <>
      <div className="toolbar">
        <div className="logo">CHARTS</div>
        <AssetDropdown selected={symbols} onChange={setSymbols} />
        <SimpleSelect label="Timeframe" options={TIMEFRAMES} value={tf} onChange={setTf} displayFn={v => v.short} />
        <SimpleSelect label="Layout" options={COUNT_OPTS} value={countOpt} onChange={setCount} displayFn={v => v.label} />
        <div className="toolbar-sep" />
        <button className="toolbar-icon-btn" onClick={() => setShowSave(true)}>💾 Save</button>
        <button className="toolbar-icon-btn" onClick={onOpenTemplates}>
          📁 Templates {templates.length > 0 && <span className="badge">{templates.length}</span>}
        </button>
        <span className="layout-info">{slots.length}/{symbols.length} · {cols}×{rows} · double-click to fullscreen</span>
      </div>

      {slots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>No assets selected</div>
          <div style={{ fontSize: 12 }}>Open the Assets dropdown to add charts</div>
        </div>
      ) : (
        <div className="chart-grid" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
          {slots.map((a, i) => (
            <div key={`${a.symbol}-${tf.interval}`} style={{ minHeight: 0, height: "100%", cursor: "crosshair" }}
              onDoubleClick={() => setFsIdx(i)}>
              <TvChart symbol={a.symbol} interval={tf.interval} />
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen overlay */}
      {fsIdx !== null && slots[fsIdx] && (
        <FullscreenOverlay
          symbol={slots[fsIdx].symbol}
          interval={tf.interval}
          label={`${slots[fsIdx].label} · ${tf.short}`}
          onExit={() => setFsIdx(null)}
        />
      )}

      {showSave && (
        <SaveDialog
          defaultName={`Standard Layout ${new Date().toLocaleDateString()}`}
          onSave={handleSave}
          onClose={() => setShowSave(false)}
        />
      )}
    </>
  );
}

// ─── Custom mode ──────────────────────────────────────────────────────────────

function CustomMode({
  templates, onSaveTemplate, onOpenTemplates,
}: {
  templates: SavedTemplate[];
  onSaveTemplate: (t: Omit<SavedTemplate, "id" | "createdAt">) => void;
  onOpenTemplates: () => void;
}) {
  const savedCustom = load<{ slots: CustomSlot[] }>(KEY_CUSTOM, {
    slots: [
      { id: uid(), symbol: "TVC:GOLD",        interval: "D"   },
      { id: uid(), symbol: "FX:EURUSD",       interval: "240" },
      { id: uid(), symbol: "FX:GBPUSD",       interval: "60"  },
      { id: uid(), symbol: "FOREXCOM:SPXUSD", interval: "D"   },
    ],
  });

  const [slots, setSlots]       = useState<CustomSlot[]>(savedCustom.slots.length ? savedCustom.slots : []);
  const [showSave, setShowSave] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const { fsIdx, setFsIdx }     = useFullscreen();
  const [bulkSym, setBulkSym]   = useState("");
  const [bulkTFs, setBulkTFs]   = useState<string[]>([]);
  const bulkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setShowBulk(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { persist(KEY_CUSTOM, { slots }); }, [slots]);

  const addSlot = () => setSlots(p => [...p, { id: uid(), symbol: "TVC:GOLD", interval: "D" }]);
  const removeSlot = (id: string) => setSlots(p => p.filter(s => s.id !== id));
  const updateSlot = (id: string, patch: Partial<CustomSlot>) =>
    setSlots(p => p.map(s => s.id === id ? { ...s, ...patch } : s));

  const applyBulk = () => {
    if (!bulkSym || !bulkTFs.length) return;
    setSlots(p => [...p, ...bulkTFs.map(iv => ({ id: uid(), symbol: bulkSym, interval: iv }))]);
    setShowBulk(false); setBulkTFs([]); setBulkSym("");
  };

  const handleSave = (name: string) => {
    onSaveTemplate({ name, mode: "custom", customSlots: slots });
    setShowSave(false);
  };

  const visibleSlots = slots.slice(0, 12);
  const { cols, rows } = getGrid(Math.max(1, visibleSlots.length));

  return (
    <>
      <div className="toolbar">
        <div className="logo">CHARTS</div>

        {/* Add one slot */}
        <button className="toolbar-action-btn" onClick={addSlot}>+ Add Chart</button>

        {/* One pair × multiple TFs */}
        <div ref={bulkRef} style={{ position: "relative" }}>
          <button className="toolbar-action-btn highlight" onClick={() => setShowBulk(o => !o)}>
            ⚡ Multi-Timeframe
          </button>
          {showBulk && (
            <div className="dropdown-menu" style={{ width: 290, padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--muted))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                One Pair × Multiple Timeframes
              </div>
              <div>
                <div style={{ fontSize: 10, color: "hsl(var(--muted))", marginBottom: 5 }}>Pair</div>
                <select className="native-select" value={bulkSym} onChange={e => setBulkSym(e.target.value)}>
                  <option value="">— pick a pair —</option>
                  {ASSET_GROUPS.map(g => (
                    <optgroup key={g.key} label={g.label}>
                      {ASSETS.filter(a => a.group === g.key).map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "hsl(var(--muted))", marginBottom: 5 }}>Timeframes</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 10px" }}>
                  {TIMEFRAMES.map(tf => (
                    <label key={tf.interval} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: "hsl(var(--text2))" }}>
                      <input type="checkbox" checked={bulkTFs.includes(tf.interval)}
                        onChange={() => setBulkTFs(p => p.includes(tf.interval) ? p.filter(x => x !== tf.interval) : [...p, tf.interval])}
                        style={{ accentColor: "hsl(210 100% 56%)" }} />
                      {tf.short}
                    </label>
                  ))}
                </div>
              </div>
              <button className="apply-bulk-btn" disabled={!bulkSym || !bulkTFs.length} onClick={applyBulk}>
                Add {bulkTFs.length || 0} chart{bulkTFs.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>

        {slots.length > 0 && (
          <button className="mini-btn" style={{ fontSize: 11 }} onClick={() => setSlots([])}>Clear All</button>
        )}

        <div className="toolbar-sep" />
        <button className="toolbar-icon-btn" onClick={() => setShowSave(true)}>💾 Save</button>
        <button className="toolbar-icon-btn has-badge" onClick={onOpenTemplates}>
          📁 Templates {templates.length > 0 && <span className="badge">{templates.length}</span>}
        </button>
        <span className="layout-info">{visibleSlots.length} chart{visibleSlots.length !== 1 ? "s" : ""} · {cols}×{rows} · double-click to fullscreen</span>
      </div>

      {slots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>⚙️</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>No charts yet</div>
          <div style={{ fontSize: 12 }}>Click "+ Add Chart" to add a chart, or use "⚡ Multi-Timeframe" for one pair across multiple timeframes</div>
        </div>
      ) : (
        <div className="chart-grid"
          style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
          {visibleSlots.map((slot, i) => {
            const assetLabel = ASSETS.find(a => a.symbol === slot.symbol)?.label ?? slot.symbol;
            const tfShort    = TIMEFRAMES.find(t => t.interval === slot.interval)?.short ?? slot.interval;
            return (
              <div key={slot.id} style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", background: "hsl(var(--bg))" }}>
                {/* ── Chart header ── */}
                <div className="chart-header">
                  <InlineSelect
                    value={slot.symbol}
                    options={ASSET_OPTS}
                    onChange={v => updateSlot(slot.id, { symbol: v })}
                    grouped
                  />
                  <div className="chart-header-sep" />
                  <InlineSelect
                    value={slot.interval}
                    options={TF_OPTS}
                    onChange={v => updateSlot(slot.id, { interval: v })}
                  />
                  <div style={{ flex: 1 }} />
                  {/* Fullscreen button */}
                  <button
                    className="remove-slot-btn"
                    onClick={() => setFsIdx(i)}
                    title="Fullscreen (or double-click chart)"
                    style={{ color: "hsl(var(--muted))", marginRight: 2 }}
                  >⛶</button>
                  <button className="remove-slot-btn" onClick={() => removeSlot(slot.id)} title="Remove">✕</button>
                </div>
                {/* ── Iframe ── */}
                <div style={{ flex: 1, minHeight: 0, cursor: "crosshair" }}
                  onDoubleClick={() => setFsIdx(i)}>
                  <TvChart symbol={slot.symbol} interval={slot.interval} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen overlay */}
      {fsIdx !== null && visibleSlots[fsIdx] && (() => {
        const s = visibleSlots[fsIdx];
        const assetLabel = ASSETS.find(a => a.symbol === s.symbol)?.label ?? s.symbol;
        const tfShort    = TIMEFRAMES.find(t => t.interval === s.interval)?.short ?? s.interval;
        return (
          <FullscreenOverlay
            symbol={s.symbol}
            interval={s.interval}
            label={`${assetLabel} · ${tfShort}`}
            onExit={() => setFsIdx(null)}
          />
        );
      })()}

      {showSave && (
        <SaveDialog
          defaultName={`Custom Layout ${new Date().toLocaleDateString()}`}
          onSave={handleSave}
          onClose={() => setShowSave(false)}
        />
      )}
    </>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode]             = useState<DashMode>(() => load<DashMode>(KEY_MODE, "standard"));
  const [templates, setTemplates]   = useState<SavedTemplate[]>(() => loadTemplates());
  const [showTemplates, setShowTpl] = useState(false);
  const [loadedTpl, setLoadedTpl]   = useState<SavedTemplate | null>(null);

  const switchMode = (m: DashMode) => { setMode(m); persist(KEY_MODE, m); };

  const saveTemplate = useCallback((t: Omit<SavedTemplate, "id" | "createdAt">) => {
    const tpl: SavedTemplate = { ...t, id: uid(), createdAt: Date.now() };
    setTemplates(prev => {
      const next = [tpl, ...prev];
      saveTemplates(next);
      return next;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTemplates(next);
      return next;
    });
  }, []);

  const loadTemplate = useCallback((t: SavedTemplate) => {
    // Write template data into localStorage BEFORE remounting so the
    // child component's useState(() => load(...)) picks up fresh values.
    if (t.mode === "standard") {
      persist(KEY_STD, {
        symbols:    t.stdSymbols  ?? ["TVC:GOLD"],
        tfInterval: t.stdInterval ?? "D",
        count:      t.stdCount    ?? 4,
      });
    } else {
      persist(KEY_CUSTOM, { slots: t.customSlots ?? [] });
    }
    persist(KEY_MODE, t.mode);
    setMode(t.mode);
    // Change key to force full remount with fresh localStorage values
    setLoadedTpl({ ...t, createdAt: Date.now() });
    setShowTpl(false);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Mode tabs */}
      <div className="mode-strip">
        <button className={`mode-tab ${mode === "standard" ? "active" : ""}`} onClick={() => switchMode("standard")}>Standard</button>
        <button className={`mode-tab ${mode === "custom" ? "active" : ""}`} onClick={() => switchMode("custom")}>⚙ Custom</button>
      </div>

      {mode === "standard"
        ? <StandardMode key={loadedTpl?.id} templates={templates} onSaveTemplate={saveTemplate} onOpenTemplates={() => setShowTpl(true)} />
        : <CustomMode   key={loadedTpl?.id} templates={templates} onSaveTemplate={saveTemplate} onOpenTemplates={() => setShowTpl(true)} />
      }

      {showTemplates && (
        <TemplatesPanel
          templates={templates}
          onLoad={loadTemplate}
          onDelete={deleteTemplate}
          onClose={() => setShowTpl(false)}
        />
      )}
    </div>
  );
}
