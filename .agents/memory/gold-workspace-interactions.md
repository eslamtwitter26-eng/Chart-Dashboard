---
name: Gold workspace interactions
description: Earlier native Gold Lab interaction requirements and scope boundaries for the supplied HTML replacement.
---

Keep Gold Lab freely pannable on desktop and with single-finger hold-and-drag on phones. Do not lock chart edges to eliminate future whitespace.

**Why:** After approving the removal of weekend stagnation and long explanatory text, the user explicitly reported that edge-constrained movement was unusable and asked for free movement. Weekend compression should come from the display data, not navigation restrictions.

**How to apply:** Preserve the accepted weekend compression and collapsed data information while allowing pan/zoom. A mobile long-press must not trap the user in crosshair tracking. Time remaining must refer to the actual supplied candle; when it has expired and no new data is supplied, show a waiting state rather than a fictional active candle.

ICT replaces the traditional indicators only inside Gold Lab; the user explicitly wants the outside TradingView indicators left unchanged.

**Why:** The user requested FVG, Order Blocks, Breaker Blocks and related ICT tools on every Gold Lab timeframe, but scoped removal of RSI/EMA/SMA to Gold Lab.

**How to apply:** Keep these changes isolated from Standard/Custom widgets. Explain the chosen mechanical detection rules on request; do not claim a universal ICT implementation, guaranteed signals, or a Pine runtime.

The user may replace the whole Gold Lab implementation by supplying a new HTML file. The most recently supplied standalone HTML is authoritative; earlier native or uploaded implementations are not requirements to restore.

**Why:** The user explicitly requested using their code; its PAXG/USDT market trades through the weekend and its available tools differ from the prior implementation.

**How to apply:** Preserve the latest replacement unless the user requests changes to it. Keep Gold Lab changes isolated from the other tabs, preserve the dashboard-to-iframe theme sync when changing HTML, and do not present token prices as identical to spot gold.

Gold Lab should use the main interface's colors rather than the uploaded file's separate brown/gold theme.

**Why:** The user explicitly requested: “غير الثيم الخاص بالجولد لاب خليه زيه زي الوان الواجهه الرييسيه”.

**How to apply:** Follow the dashboard palette, including its dark/light setting, while preserving Gold Lab's layout, market source and analysis behavior. Do not restore an independent gold-colored interface theme just because it appeared in the original upload.

If Binance requests from the browser stall, proxy the same PAXG/USDT feed through the authenticated same-origin API and bound every request with a timeout; do not switch market-data sources to mask a connectivity problem.

**Why:** The supplied Gold Lab uses Binance PAXG/USDT, but browser cross-origin requests may hang even when the server can reach Binance.

**How to apply:** Keep the source, symbol and candle values unchanged; use server-side access control, validate upstream OHLC, and show a finite loading/error state.
