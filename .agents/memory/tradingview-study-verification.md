---
name: TradingView study verification
description: Why indicator changes require checking actual rendered study panes, not only dashboard controls or serialization tests.
---

When modifying the TradingView integration, verify the widget with selected indicators actually rendered. A screenshot of the default price-only dashboard, passing type checks, and correct JSON serialization are not sufficient.

**Why:** The indicator picker initially saved selections correctly, but TradingView silently ignored the legacy query-string study settings. This escaped checks of controls and URL encoding; the user reported that no studies appeared. The official advanced-chart configuration rendered RSI, MACD and Stochastic successfully when visually checked.

**How to apply:** Inspect a rendered widget using the same configuration produced by the app, with the requested studies selected. Confirm their labels and plotted panes or overlays, not just the dashboard's active count. Ensure changing a hash-based configuration recreates the frame rather than only navigating within its existing document.
