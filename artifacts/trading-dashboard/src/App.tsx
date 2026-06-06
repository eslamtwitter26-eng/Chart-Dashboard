import { useState, useCallback, useMemo } from "react";

// ─── Asset definitions ───────────────────────────────────────────────────────

type AssetGroup = "metals" | "indices" | "forex";

interface Asset {
  symbol: string;
  label: string;
  group: AssetGroup;
}

const ASSETS: Asset[] = [
  // Metals / Commodities
  { symbol: "TVC:GOLD",   label: "XAU/USD",  group: "metals" },
  { symbol: "TVC:SILVER", label: "XAG/USD",  group: "metals" },
  { symbol: "NYMEX:CL1!", label: "Oil WTI",  group: "metals" },
  { symbol: "NYMEX:NG1!", label: "Nat Gas",  group: "metals" },

  // Indices
  { symbol: "FOREXCOM:SPXUSD",  label: "S&P 500",  group: "indices" },
  { symbol: "FOREXCOM:NSXUSD",  label: "NASDAQ",   group: "indices" },
  { symbol: "FOREXCOM:DJI",     label: "Dow Jones", group: "indices" },
  { symbol: "FOREXCOM:UKXGBP",  label: "FTSE 100", group: "indices" },
  { symbol: "XETR:DAX",         label: "DAX",       group: "indices" },
  { symbol: "TVC:NI225",        label: "Nikkei",    group: "indices" },

  // Forex
  { symbol: "FX:EURUSD", label: "EUR/USD", group: "forex" },
  { symbol: "FX:GBPUSD", label: "GBP/USD", group: "forex" },
  { symbol: "FX:USDJPY", label: "USD/JPY", group: "forex" },
  { symbol: "FX:USDCHF", label: "USD/CHF", group: "forex" },
  { symbol: "FX:AUDUSD", label: "AUD/USD", group: "forex" },
  { symbol: "FX:USDCAD", label: "USD/CAD", group: "forex" },
  { symbol: "FX:NZDUSD", label: "NZD/USD", group: "forex" },
  { symbol: "FX:USDJPY", label: "USD/JPY", group: "forex" },
];

// ─── Timeframe definitions ────────────────────────────────────────────────────

interface Timeframe {
  interval: string;
  label: string;
}

const TIMEFRAMES: Timeframe[] = [
  { interval: "M",   label: "1M"  },
  { interval: "W",   label: "1W"  },
  { interval: "D",   label: "1D"  },
  { interval: "240", label: "4H"  },
  { interval: "60",  label: "1H"  },
  { interval: "30",  label: "30m" },
  { interval: "15",  label: "15m" },
  { interval: "5",   label: "5m"  },
  { interval: "1",   label: "1m"  },
];

// ─── Chart slot ───────────────────────────────────────────────────────────────

interface ChartSlot {
  asset: Asset;
  timeframe: Timeframe;
}

// ─── TradingView chart widget ─────────────────────────────────────────────────

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
    <div className="chart-cell">
      <div className="chart-label">
        {asset.label} · {timeframe.label}
      </div>
      <iframe
        src={src}
        title={`${asset.label} ${timeframe.label}`}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
      />
    </div>
  );
}

// ─── Grid layout calculator ───────────────────────────────────────────────────

function getGridLayout(count: number): { cols: number; rows: number } {
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count <= 6)  return { cols: 3, rows: 2 };
  if (count <= 8)  return { cols: 4, rows: 2 };
  if (count <= 9)  return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: 3 };
}

// ─── Default chart slots ──────────────────────────────────────────────────────

function buildDefaultSlots(count: number, tf: Timeframe): ChartSlot[] {
  const defaults: ChartSlot[] = [
    { asset: ASSETS[0],  timeframe: tf }, // Gold
    { asset: ASSETS[4],  timeframe: tf }, // S&P
    { asset: ASSETS[5],  timeframe: tf }, // NASDAQ
    { asset: ASSETS[10], timeframe: tf }, // EUR/USD
    { asset: ASSETS[11], timeframe: tf }, // GBP/USD
    { asset: ASSETS[12], timeframe: tf }, // USD/JPY
    { asset: ASSETS[1],  timeframe: tf }, // Silver
    { asset: ASSETS[2],  timeframe: tf }, // Oil
    { asset: ASSETS[6],  timeframe: tf }, // DJI
    { asset: ASSETS[7],  timeframe: tf }, // FTSE
    { asset: ASSETS[13], timeframe: tf }, // USD/CHF
    { asset: ASSETS[14], timeframe: tf }, // AUD/USD
  ];
  return defaults.slice(0, count);
}

// ─── Slot picker modal ────────────────────────────────────────────────────────

interface SlotPickerProps {
  slotIndex: number;
  current: ChartSlot;
  onClose: () => void;
  onApply: (index: number, slot: ChartSlot) => void;
}

function SlotPicker({ slotIndex, current, onClose, onApply }: SlotPickerProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(current.asset);
  const [selectedTf, setSelectedTf] = useState<Timeframe>(current.timeframe);
  const [group, setGroup] = useState<AssetGroup | "all">("all");

  const filteredAssets = group === "all" ? ASSETS : ASSETS.filter(a => a.group === group);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg border shadow-2xl"
        style={{
          background: "hsl(222 47% 11%)",
          borderColor: "hsl(217 33% 22%)",
          width: 420,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid hsl(217 33% 18%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(213 31% 91%)" }}>
            Edit Chart #{slotIndex + 1}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "hsl(215 20% 50%)",
              cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px",
            }}
          >×</button>
        </div>

        {/* Asset group filter */}
        <div style={{ padding: "10px 16px 6px", display: "flex", gap: 6 }}>
          {(["all", "metals", "indices", "forex"] as const).map(g => (
            <button
              key={g}
              className={`group-tab ${group === g ? "active" : ""}`}
              onClick={() => setGroup(g)}
            >
              {g === "all" ? "ALL" : g === "metals" ? "METALS" : g === "indices" ? "INDICES" : "FOREX"}
            </button>
          ))}
        </div>

        {/* Asset list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "6px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {filteredAssets.map(asset => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: `1px solid ${selectedAsset.symbol === asset.symbol
                    ? "hsl(210 100% 56% / 0.4)"
                    : "hsl(217 33% 20%)"}`,
                  background: selectedAsset.symbol === asset.symbol
                    ? "hsl(210 100% 56% / 0.12)"
                    : "hsl(222 47% 13%)",
                  color: selectedAsset.symbol === asset.symbol
                    ? "hsl(210 100% 68%)"
                    : "hsl(215 20% 65%)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.1s",
                  fontFamily: "inherit",
                }}
              >
                {asset.label}
                <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, opacity: 0.6 }}>
                  {asset.group === "metals" ? "🏅" : asset.group === "indices" ? "📈" : "💱"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe selector */}
        <div style={{
          padding: "10px 16px 8px",
          borderTop: "1px solid hsl(217 33% 18%)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "hsl(215 20% 45%)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Timeframe
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.interval}
                className={`tool-btn tf-btn ${selectedTf.interval === tf.interval ? "active" : ""}`}
                onClick={() => setSelectedTf(tf)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: "10px 16px 14px",
          borderTop: "1px solid hsl(217 33% 18%)",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px", borderRadius: 6,
              border: "1px solid hsl(217 33% 22%)",
              background: "transparent",
              color: "hsl(215 20% 60%)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onApply(slotIndex, { asset: selectedAsset, timeframe: selectedTf }); onClose(); }}
            style={{
              padding: "7px 20px", borderRadius: 6,
              border: "none",
              background: "hsl(210 100% 56%)",
              color: "white",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [chartCount, setChartCount]         = useState(4);
  const [globalTf, setGlobalTf]             = useState<Timeframe>(TIMEFRAMES[2]); // 1D
  const [activeGroup, setActiveGroup]       = useState<AssetGroup | "all">("all");
  const [slots, setSlots]                   = useState<ChartSlot[]>(() => buildDefaultSlots(12, TIMEFRAMES[2]));
  const [editingSlot, setEditingSlot]       = useState<number | null>(null);

  // When chart count changes, fill missing slots with sensible defaults
  const handleCountChange = useCallback((n: number) => {
    setChartCount(n);
    setSlots(prev => {
      if (prev.length >= n) return prev;
      const extras = buildDefaultSlots(n, globalTf).slice(prev.length);
      return [...prev, ...extras];
    });
  }, [globalTf]);

  // Apply global TF change to ALL slots
  const handleGlobalTf = useCallback((tf: Timeframe) => {
    setGlobalTf(tf);
    setSlots(prev => prev.map(s => ({ ...s, timeframe: tf })));
  }, []);

  // Quick-add an asset (sets the next empty slot or last slot)
  const handleAssetQuickAdd = useCallback((asset: Asset) => {
    setSlots(prev => {
      const next = [...prev];
      // Find first slot with different asset, or just pick slot 0
      const idx = Math.min(prev.length - 1, 0);
      next[idx] = { ...next[idx], asset };
      return next;
    });
  }, []);

  const handleApplySlot = useCallback((index: number, slot: ChartSlot) => {
    setSlots(prev => {
      const next = [...prev];
      next[index] = slot;
      return next;
    });
  }, []);

  const visibleSlots = slots.slice(0, chartCount);
  const { cols, rows } = getGridLayout(chartCount);

  const assetGroups = [
    { key: "all" as const,     label: "All Assets" },
    { key: "metals" as const,  label: "Metals" },
    { key: "indices" as const, label: "Indices" },
    { key: "forex" as const,   label: "Forex" },
  ];

  const filteredQuickAssets = activeGroup === "all"
    ? ASSETS
    : ASSETS.filter(a => a.group === activeGroup);

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="logo">CHARTS</div>

        {/* Asset group tabs */}
        <div className="toolbar-section">
          <span className="toolbar-label">Assets</span>
          <div className="group-tabs">
            {assetGroups.map(g => (
              <button
                key={g.key}
                className={`group-tab ${activeGroup === g.key ? "active" : ""}`}
                onClick={() => setActiveGroup(g.key)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick asset buttons for active group */}
        <div className="toolbar-section" style={{ gap: 2, flexShrink: 1, overflow: "hidden" }}>
          {filteredQuickAssets.slice(0, 10).map(asset => (
            <button
              key={asset.symbol}
              className="tool-btn asset-btn"
              onClick={() => handleAssetQuickAdd(asset)}
              title={`Add ${asset.label} to chart 1`}
            >
              {asset.label}
            </button>
          ))}
        </div>

        {/* Chart count */}
        <div className="toolbar-section">
          <span className="toolbar-label">#</span>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`tool-btn num-btn ${chartCount === n ? "active" : ""}`}
              onClick={() => handleCountChange(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Timeframe */}
        <div className="toolbar-section">
          <span className="toolbar-label">TF</span>
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.interval}
              className={`tool-btn tf-btn ${globalTf.interval === tf.interval ? "active" : ""}`}
              onClick={() => handleGlobalTf(tf)}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <span className="layout-info">
          {cols}×{rows} · {chartCount} chart{chartCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Chart grid ── */}
      <div
        className="chart-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {visibleSlots.map((slot, i) => (
          <div key={i} style={{ position: "relative", minHeight: 0, height: "100%" }}>
            <TvChart asset={slot.asset} timeframe={slot.timeframe} />
            {/* Edit button */}
            <button
              onClick={() => setEditingSlot(i)}
              style={{
                position: "absolute",
                top: 6,
                right: 8,
                zIndex: 20,
                background: "hsl(222 47% 14% / 0.85)",
                border: "1px solid hsl(217 33% 22%)",
                color: "hsl(215 20% 55%)",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 10,
                cursor: "pointer",
                backdropFilter: "blur(4px)",
                fontFamily: "inherit",
                transition: "all 0.1s",
              }}
              title="Edit this chart"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* ── Slot picker modal ── */}
      {editingSlot !== null && (
        <SlotPicker
          slotIndex={editingSlot}
          current={slots[editingSlot]}
          onClose={() => setEditingSlot(null)}
          onApply={handleApplySlot}
        />
      )}
    </>
  );
}
