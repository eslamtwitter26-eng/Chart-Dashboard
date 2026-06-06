import { useState, useCallback, useEffect, useRef, useMemo } from "react";

// ─── Types & Data ─────────────────────────────────────────────────────────────

type AssetGroup = "metals" | "indices" | "forex";

interface Asset {
  symbol: string;
  label: string;
  group: AssetGroup;
  flag?: string;
}

const ASSET_GROUPS: { key: AssetGroup; label: string }[] = [
  { key: "metals",  label: "🏅 Metals & Commodities" },
  { key: "indices", label: "📈 Indices" },
  { key: "forex",   label: "💱 Forex" },
];

const ASSETS: Asset[] = [
  // Metals
  { symbol: "TVC:GOLD",   label: "Gold (XAU/USD)",     group: "metals" },
  { symbol: "TVC:SILVER", label: "Silver (XAG/USD)",   group: "metals" },
  { symbol: "NYMEX:CL1!", label: "Oil WTI",            group: "metals" },
  { symbol: "NYMEX:NG1!", label: "Natural Gas",        group: "metals" },
  { symbol: "COMEX:HG1!", label: "Copper",             group: "metals" },
  // Indices
  { symbol: "FOREXCOM:SPXUSD", label: "S&P 500",       group: "indices" },
  { symbol: "FOREXCOM:NSXUSD", label: "NASDAQ 100",    group: "indices" },
  { symbol: "FOREXCOM:DJI",    label: "Dow Jones",     group: "indices" },
  { symbol: "FOREXCOM:UKXGBP", label: "FTSE 100",      group: "indices" },
  { symbol: "XETR:DAX",        label: "DAX 40",        group: "indices" },
  { symbol: "TVC:NI225",       label: "Nikkei 225",    group: "indices" },
  { symbol: "TVC:HSI",         label: "Hang Seng",     group: "indices" },
  // Forex
  { symbol: "FX:EURUSD", label: "EUR/USD",  group: "forex" },
  { symbol: "FX:GBPUSD", label: "GBP/USD",  group: "forex" },
  { symbol: "FX:USDJPY", label: "USD/JPY",  group: "forex" },
  { symbol: "FX:USDCHF", label: "USD/CHF",  group: "forex" },
  { symbol: "FX:AUDUSD", label: "AUD/USD",  group: "forex" },
  { symbol: "FX:USDCAD", label: "USD/CAD",  group: "forex" },
  { symbol: "FX:NZDUSD", label: "NZD/USD",  group: "forex" },
  { symbol: "FX:GBPJPY", label: "GBP/JPY",  group: "forex" },
  { symbol: "FX:EURJPY", label: "EUR/JPY",  group: "forex" },
  { symbol: "FX:EURGBP", label: "EUR/GBP",  group: "forex" },
];

interface Timeframe { interval: string; label: string }

const TIMEFRAMES: Timeframe[] = [
  { interval: "M",   label: "Monthly (1M)"  },
  { interval: "W",   label: "Weekly (1W)"   },
  { interval: "D",   label: "Daily (1D)"    },
  { interval: "240", label: "4 Hours (4H)"  },
  { interval: "60",  label: "1 Hour (1H)"   },
  { interval: "30",  label: "30 Minutes"    },
  { interval: "15",  label: "15 Minutes"    },
  { interval: "5",   label: "5 Minutes"     },
  { interval: "1",   label: "1 Minute"      },
];

const CHART_COUNTS = Array.from({ length: 12 }, (_, i) => i + 1);

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "trading-dashboard-v1";

interface SavedLayout {
  selectedSymbols: string[];
  timeframeInterval: string;
  chartCount: number;
}

function loadLayout(): SavedLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLayout(layout: SavedLayout) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch {}
}

// ─── Grid layout ──────────────────────────────────────────────────────────────

function getGridLayout(count: number) {
  if (count === 1)  return { cols: 1, rows: 1 };
  if (count === 2)  return { cols: 2, rows: 1 };
  if (count === 3)  return { cols: 3, rows: 1 };
  if (count === 4)  return { cols: 2, rows: 2 };
  if (count <= 6)   return { cols: 3, rows: 2 };
  if (count <= 8)   return { cols: 4, rows: 2 };
  if (count <= 9)   return { cols: 3, rows: 3 };
  return             { cols: 4, rows: 3 };
}

// ─── TradingView chart ────────────────────────────────────────────────────────

function TvChart({ asset, timeframe }: { asset: Asset; timeframe: Timeframe }) {
  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: asset.symbol,
      interval: timeframe.interval,
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: "0",
      hide_legend: "1",
      hide_side_toolbar: "1",
      allow_symbol_change: "0",
      save_image: "0",
      studies: "[]",
      withdateranges: "0",
      hidevolume: "1",
    });
    return `https://www.tradingview.com/widgetembed/?${params.toString()}`;
  }, [asset.symbol, timeframe.interval]);

  return (
    <div style={{ position: "relative", height: "100%", background: "hsl(222 47% 9%)", overflow: "hidden" }}>
      <div className="chart-label">{asset.label} · {timeframe.label.split(" ")[0]}</div>
      <iframe
        src={src}
        title={`${asset.label} ${timeframe.label}`}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}

// ─── Dropdown Component ───────────────────────────────────────────────────────

interface DropdownProps {
  label: string;
  value: string;
  children: React.ReactNode;
  onToggle?: () => void;
  isOpen?: boolean;
}

function Dropdown({ label, value, children, isOpen, onToggle }: DropdownProps) {
  return (
    <div style={{ position: "relative" }}>
      <button className="dropdown-btn" onClick={onToggle}>
        <span className="dropdown-label">{label}</span>
        <span className="dropdown-value">{value}</span>
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Asset Multi-Select Dropdown ──────────────────────────────────────────────

function AssetDropdown({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (symbols: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (symbol: string) => {
    onChange(
      selected.includes(symbol)
        ? selected.filter(s => s !== symbol)
        : [...selected, symbol]
    );
  };

  const filtered = ASSETS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = selected.length === 0
    ? "Select assets…"
    : selected.length === 1
      ? ASSETS.find(a => a.symbol === selected[0])?.label ?? "1 asset"
      : `${selected.length} assets selected`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="dropdown-btn" onClick={() => setOpen(o => !o)}>
        <span className="dropdown-label">Assets</span>
        <span className="dropdown-value" style={{ maxWidth: 160 }}>{selectedLabel}</span>
        <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="dropdown-menu" style={{ width: 280, maxHeight: 420 }}>
          {/* Search */}
          <div style={{ padding: "8px 10px 6px" }}>
            <input
              className="search-input"
              placeholder="Search assets…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Select all / Clear */}
          <div style={{ display: "flex", gap: 6, padding: "2px 10px 8px", borderBottom: "1px solid hsl(217 33% 18%)" }}>
            <button className="mini-btn" onClick={() => onChange(ASSETS.map(a => a.symbol))}>
              Select All
            </button>
            <button className="mini-btn" onClick={() => onChange([])}>
              Clear
            </button>
          </div>

          {/* Asset list grouped */}
          <div style={{ overflowY: "auto", maxHeight: 310 }}>
            {ASSET_GROUPS.map(group => {
              const groupAssets = filtered.filter(a => a.group === group.key);
              if (groupAssets.length === 0) return null;
              return (
                <div key={group.key}>
                  <div className="asset-group-header">{group.label}</div>
                  {groupAssets.map(asset => (
                    <label key={asset.symbol} className="asset-option">
                      <input
                        type="checkbox"
                        checked={selected.includes(asset.symbol)}
                        onChange={() => toggle(asset.symbol)}
                        style={{ accentColor: "hsl(210 100% 56%)" }}
                      />
                      <span>{asset.label}</span>
                    </label>
                  ))}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "14px 12px", fontSize: 12, color: "hsl(215 20% 45%)", textAlign: "center" }}>
                No assets found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple select dropdown ───────────────────────────────────────────────────

function SelectDropdown<T extends { label: string }>({
  label,
  options,
  value,
  onChange,
  getLabel,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  getLabel?: (v: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayLabel = getLabel ? getLabel(value) : value.label;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="dropdown-btn" onClick={() => setOpen(o => !o)}>
        <span className="dropdown-label">{label}</span>
        <span className="dropdown-value">{displayLabel}</span>
        <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dropdown-menu" style={{ minWidth: 180 }}>
          {options.map((opt, i) => (
            <button
              key={i}
              className={`dropdown-option ${opt === value ? "active" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chart count objects ──────────────────────────────────────────────────────

const COUNT_OPTIONS = CHART_COUNTS.map(n => ({ label: `${n} chart${n > 1 ? "s" : ""}`, value: n }));

// ─── Main App ─────────────────────────────────────────────────────────────────

const DEFAULT_SYMBOLS = ["TVC:GOLD", "FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD", "FX:EURUSD"];

export default function App() {
  // Load saved state or defaults
  const saved = useMemo(() => loadLayout(), []);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(
    saved?.selectedSymbols ?? DEFAULT_SYMBOLS
  );
  const [timeframe, setTimeframe] = useState<Timeframe>(
    TIMEFRAMES.find(t => t.interval === (saved?.timeframeInterval ?? "D")) ?? TIMEFRAMES[2]
  );
  const [chartCount, setChartCount] = useState(
    COUNT_OPTIONS.find(o => o.value === (saved?.chartCount ?? 4)) ?? COUNT_OPTIONS[3]
  );
  const [saved_indicator, setSavedIndicator] = useState(false);

  // Auto-save whenever selection changes
  useEffect(() => {
    saveLayout({
      selectedSymbols,
      timeframeInterval: timeframe.interval,
      chartCount: chartCount.value,
    });
  }, [selectedSymbols, timeframe, chartCount]);

  // The slots to display = selected assets trimmed to chartCount
  const displaySlots = useMemo(() => {
    const assets = selectedSymbols
      .map(sym => ASSETS.find(a => a.symbol === sym))
      .filter(Boolean) as Asset[];
    return assets.slice(0, chartCount.value);
  }, [selectedSymbols, chartCount.value]);

  const handleSave = useCallback(() => {
    saveLayout({ selectedSymbols, timeframeInterval: timeframe.interval, chartCount: chartCount.value });
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  }, [selectedSymbols, timeframe, chartCount]);

  const { cols, rows } = getGridLayout(Math.max(1, displaySlots.length));

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="logo">CHARTS</div>

        <AssetDropdown selected={selectedSymbols} onChange={setSelectedSymbols} />

        <SelectDropdown
          label="Timeframe"
          options={TIMEFRAMES}
          value={timeframe}
          onChange={setTimeframe}
        />

        <SelectDropdown
          label="Layout"
          options={COUNT_OPTIONS}
          value={chartCount}
          onChange={setChartCount}
          getLabel={v => v.label}
        />

        {/* Save button */}
        <button
          className={`save-btn ${saved_indicator ? "saved" : ""}`}
          onClick={handleSave}
          title="Save current layout"
        >
          {saved_indicator ? "✓ Saved!" : "💾 Save"}
        </button>

        {/* Status */}
        <span className="layout-info">
          {displaySlots.length} / {selectedSymbols.length} assets · {cols}×{rows}
        </span>
      </div>

      {/* ── Empty state ── */}
      {displaySlots.length === 0 && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          color: "hsl(215 20% 40%)",
        }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No assets selected</div>
          <div style={{ fontSize: 13 }}>Open the Assets dropdown to choose what you want to chart</div>
        </div>
      )}

      {/* ── Chart grid ── */}
      {displaySlots.length > 0 && (
        <div
          className="chart-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {displaySlots.map((asset, i) => (
            <TvChart key={`${asset.symbol}-${timeframe.interval}`} asset={asset} timeframe={timeframe} />
          ))}
        </div>
      )}
    </>
  );
}
