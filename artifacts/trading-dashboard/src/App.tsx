import { useState, useCallback, useEffect, useRef, useMemo } from "react";

// ─── Types & Data ─────────────────────────────────────────────────────────────

type AssetGroup = "metals" | "indices" | "forex";
type DashMode = "standard" | "custom";

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

// ─── Custom slot ──────────────────────────────────────────────────────────────

interface CustomSlot {
  id: string;
  symbol: string;
  interval: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const KEY_STD    = "tdash-standard-v2";
const KEY_CUSTOM = "tdash-custom-v2";
const KEY_MODE   = "tdash-mode-v2";

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
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

// ─── TradingView clean chart ──────────────────────────────────────────────────

function TvChart({ symbol, interval, label }: { symbol: string; interval: string; label: string }) {
  const src = useMemo(() => {
    const p = new URLSearchParams({
      symbol,
      interval,
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: "1",   // hides the bar inside the chart
      hide_legend: "1",
      hide_side_toolbar: "1",
      allow_symbol_change: "0",
      save_image: "0",
      studies: "[]",
      withdateranges: "0",
      hidevolume: "1",
      hide_volume: "true",
      no_referral_id: "1",
      calendar: "0",
      news: "[]",
    });
    return `https://www.tradingview.com/widgetembed/?${p.toString()}`;
  }, [symbol, interval]);

  return (
    <div style={{ position: "relative", height: "100%", background: "hsl(222 47% 9%)", overflow: "hidden" }}>
      <div className="chart-label">{label}</div>
      <iframe
        src={src}
        title={label}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}

// ─── Reusable dropdown hook ───────────────────────────────────────────────────

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
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
        <span className="dropdown-value" style={{ maxWidth: 150 }}>{label}</span>
        <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dropdown-menu" style={{ width: 270, maxHeight: 420 }}>
          <div style={{ padding: "8px 10px 6px" }}>
            <input className="search-input" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div style={{ display: "flex", gap: 6, padding: "2px 10px 8px", borderBottom: "1px solid hsl(217 33% 18%)" }}>
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
            {!filtered.length && <div style={{ padding: 14, fontSize: 12, color: "hsl(215 20% 45%)", textAlign: "center" }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple select dropdown ───────────────────────────────────────────────────

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
        <div className="dropdown-menu" style={{ minWidth: 170 }}>
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

// ─── Inline small dropdowns (used in custom slots) ────────────────────────────

function SmallSelect({ value, options, onChange, placeholder }: {
  value: string; options: { val: string; label: string }[];
  onChange: (v: string) => void; placeholder?: string;
}) {
  const { open, setOpen, ref } = useDropdown();
  const current = options.find(o => o.val === value);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="small-select-btn" onClick={() => setOpen(o => !o)}>
        {current?.label ?? placeholder ?? "—"}
        <span style={{ opacity: 0.5, marginLeft: 3, fontSize: 8 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dropdown-menu" style={{ minWidth: 180 }}>
          {options.map(o => (
            <button key={o.val} className={`dropdown-option ${o.val === value ? "active" : ""}`}
              onClick={() => { onChange(o.val); setOpen(false); }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Count options ────────────────────────────────────────────────────────────

const COUNT_OPTS = Array.from({ length: 12 }, (_, i) => ({ label: `${i+1} chart${i > 0 ? "s" : ""}`, value: i+1 }));

// ─── Standard mode ────────────────────────────────────────────────────────────

function StandardMode() {
  const savedStd = load(KEY_STD, { symbols: ["TVC:GOLD","FOREXCOM:SPXUSD","FOREXCOM:NSXUSD","FX:EURUSD"], tfInterval: "D", count: 4 });

  const [symbols, setSymbols] = useState<string[]>(savedStd.symbols);
  const [tf, setTf]           = useState<Timeframe>(TIMEFRAMES.find(t => t.interval === savedStd.tfInterval) ?? TIMEFRAMES[2]);
  const [countOpt, setCount]  = useState(COUNT_OPTS.find(o => o.value === savedStd.count) ?? COUNT_OPTS[3]);
  const [flash, setFlash]     = useState(false);

  const handleSave = () => {
    save(KEY_STD, { symbols, tfInterval: tf.interval, count: countOpt.value });
    setFlash(true); setTimeout(() => setFlash(false), 2000);
  };

  const slots = useMemo(() =>
    symbols.map(s => ASSETS.find(a => a.symbol === s)).filter(Boolean).slice(0, countOpt.value) as Asset[],
    [symbols, countOpt.value]
  );

  const { cols, rows } = getGrid(Math.max(1, slots.length));

  return (
    <>
      {/* Toolbar row */}
      <div className="toolbar">
        <div className="logo">CHARTS</div>
        <AssetDropdown selected={symbols} onChange={setSymbols} />
        <SimpleSelect label="Timeframe" options={TIMEFRAMES} value={tf} onChange={setTf} displayFn={v => v.short} />
        <SimpleSelect label="Layout" options={COUNT_OPTS} value={countOpt} onChange={setCount} displayFn={v => v.label} />
        <button className={`save-btn ${flash ? "saved" : ""}`} onClick={handleSave}>
          {flash ? "✓ Saved" : "💾 Save"}
        </button>
        <span className="layout-info">{slots.length}/{symbols.length} · {cols}×{rows}</span>
      </div>

      {slots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>No assets selected</div>
          <div style={{ fontSize: 12 }}>Open the Assets dropdown and pick what you want to chart</div>
        </div>
      ) : (
        <div className="chart-grid" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
          {slots.map(a => {
            const tfShort = tf.short;
            return <TvChart key={`${a.symbol}-${tf.interval}`} symbol={a.symbol} interval={tf.interval} label={`${a.label} · ${tfShort}`} />;
          })}
        </div>
      )}
    </>
  );
}

// ─── Custom mode ──────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `s${++_id}`;

const ASSET_OPTS  = ASSETS.map(a => ({ val: a.symbol, label: a.label }));
const TF_OPTS     = TIMEFRAMES.map(t => ({ val: t.interval, label: `${t.short} — ${t.label}` }));

function CustomMode() {
  const savedCustom = load<{ slots: CustomSlot[] }>(KEY_CUSTOM, {
    slots: [
      { id: uid(), symbol: "TVC:GOLD",        interval: "D"  },
      { id: uid(), symbol: "FX:EURUSD",       interval: "4H" },
      { id: uid(), symbol: "FX:GBPUSD",       interval: "1H" },
      { id: uid(), symbol: "FOREXCOM:SPXUSD", interval: "D"  },
    ],
  });

  const [slots, setSlots] = useState<CustomSlot[]>(savedCustom.slots.length ? savedCustom.slots : [{ id: uid(), symbol: "TVC:GOLD", interval: "D" }]);
  const [flash, setFlash] = useState(false);

  // Quick-add helper: add one pair × multiple TFs
  const [bulkSym, setBulkSym]   = useState("");
  const [bulkTFs, setBulkTFs]   = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setBulkOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addSlot = () =>
    setSlots(p => [...p, { id: uid(), symbol: "TVC:GOLD", interval: "D" }]);

  const removeSlot = (id: string) => setSlots(p => p.filter(s => s.id !== id));

  const updateSlot = (id: string, patch: Partial<CustomSlot>) =>
    setSlots(p => p.map(s => s.id === id ? { ...s, ...patch } : s));

  const handleSave = () => {
    save(KEY_CUSTOM, { slots });
    setFlash(true); setTimeout(() => setFlash(false), 2000);
  };

  const applyBulk = () => {
    if (!bulkSym || !bulkTFs.length) return;
    const newSlots: CustomSlot[] = bulkTFs.map(iv => ({ id: uid(), symbol: bulkSym, interval: iv }));
    setSlots(p => [...p, ...newSlots]);
    setBulkOpen(false);
    setBulkTFs([]);
    setBulkSym("");
  };

  const { cols, rows } = getGrid(Math.max(1, Math.min(slots.length, 12)));
  const visibleSlots = slots.slice(0, 12);

  return (
    <>
      {/* Toolbar row */}
      <div className="toolbar">
        <div className="logo">CHARTS</div>

        {/* Add single slot */}
        <button className="toolbar-action-btn" onClick={addSlot}>+ Add Chart</button>

        {/* Bulk: one pair × multiple TFs */}
        <div ref={bulkRef} style={{ position: "relative" }}>
          <button className="toolbar-action-btn highlight" onClick={() => setBulkOpen(o => !o)}>
            ⚡ One Pair, Multi-TF
          </button>
          {bulkOpen && (
            <div className="dropdown-menu" style={{ width: 300, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(215 20% 45%)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                One Pair × Multiple Timeframes
              </div>

              {/* Pair picker */}
              <div>
                <div style={{ fontSize: 10, color: "hsl(215 20% 45%)", marginBottom: 4 }}>Pair</div>
                <select
                  className="native-select"
                  value={bulkSym}
                  onChange={e => setBulkSym(e.target.value)}
                >
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

              {/* TF checkboxes */}
              <div>
                <div style={{ fontSize: 10, color: "hsl(215 20% 45%)", marginBottom: 4 }}>Timeframes (pick multiple)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
                  {TIMEFRAMES.map(tf => (
                    <label key={tf.interval} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: "hsl(213 31% 80%)" }}>
                      <input
                        type="checkbox"
                        checked={bulkTFs.includes(tf.interval)}
                        onChange={() => setBulkTFs(p => p.includes(tf.interval) ? p.filter(x => x !== tf.interval) : [...p, tf.interval])}
                        style={{ accentColor: "hsl(210 100% 56%)" }}
                      />
                      {tf.short}
                    </label>
                  ))}
                </div>
              </div>

              <button
                className="apply-bulk-btn"
                disabled={!bulkSym || !bulkTFs.length}
                onClick={applyBulk}
              >
                Add {bulkTFs.length || 0} chart{bulkTFs.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>

        {/* Clear all */}
        {slots.length > 0 && (
          <button className="mini-btn" style={{ marginLeft: 2 }} onClick={() => setSlots([])}>Clear All</button>
        )}

        <button className={`save-btn ${flash ? "saved" : ""}`} onClick={handleSave}>
          {flash ? "✓ Saved" : "💾 Save"}
        </button>
        <span className="layout-info">{visibleSlots.length} chart{visibleSlots.length !== 1 ? "s" : ""} · {cols}×{rows}</span>
      </div>

      {slots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>⚙️</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>No charts yet</div>
          <div style={{ fontSize: 12 }}>Click "Add Chart" or use "One Pair, Multi-TF" to get started</div>
        </div>
      ) : (
        <div className="chart-grid" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
          {visibleSlots.map(slot => {
            const assetLabel = ASSETS.find(a => a.symbol === slot.symbol)?.label ?? slot.symbol;
            const tfShort    = TIMEFRAMES.find(t => t.interval === slot.interval)?.short ?? slot.interval;
            return (
              <div key={slot.id} style={{ position: "relative", height: "100%" }}>
                <TvChart symbol={slot.symbol} interval={slot.interval} label={`${assetLabel} · ${tfShort}`} />

                {/* Per-slot controls */}
                <div className="slot-controls">
                  <SmallSelect
                    value={slot.symbol}
                    options={ASSET_OPTS}
                    onChange={v => updateSlot(slot.id, { symbol: v })}
                    placeholder="Asset"
                  />
                  <SmallSelect
                    value={slot.interval}
                    options={TF_OPTS}
                    onChange={v => updateSlot(slot.id, { interval: v })}
                    placeholder="TF"
                  />
                  <button className="remove-slot-btn" onClick={() => removeSlot(slot.id)} title="Remove">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<DashMode>(() => load<DashMode>(KEY_MODE, "standard"));

  const switchMode = (m: DashMode) => { setMode(m); save(KEY_MODE, m); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Mode tab strip */}
      <div className="mode-strip">
        <button className={`mode-tab ${mode === "standard" ? "active" : ""}`} onClick={() => switchMode("standard")}>
          Standard
        </button>
        <button className={`mode-tab ${mode === "custom" ? "active" : ""}`} onClick={() => switchMode("custom")}>
          ⚙ Custom
        </button>
      </div>

      {mode === "standard" ? <StandardMode /> : <CustomMode />}
    </div>
  );
}
