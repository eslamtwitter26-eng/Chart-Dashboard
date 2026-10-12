---
name: Gold provider history quality
description: Legacy Twelve Data gold-feed irregularities; not a reason to filter the replacement Binance token market.
---

These provider-specific observations concern the earlier Twelve Data implementation. Gold Lab was subsequently replaced at the user's request with their Binance PAXG/USDT code; do not apply spot-gold weekend filtering to that 24/7 token market.

Twelve Data XAU/USD history can contain duplicate daily candle-opening timestamps and older monthly rows whose open or close is outside the stated high/low. Successful HTTP responses are not sufficient evidence that every candle is usable.

**Why:** These issues were observed in actual provider responses while building the independent gold chart; rendering them uncritically produces ambiguous candles and misleading indicator calculations.

**How to apply:** Validate source OHLC and UTC times before rendering. Historical omissions must be counted and disclosed; never silently adjust prices or fabricate gap fills. Invalid or ambiguous newest data must fail rather than masquerade as a fresh quote. Keep fetched time separate from candle-opening time.

The same source supplies weekend gold quotes with small, nonzero fluctuations, even when spot-gold markets are conventionally closed. Flatness or identical OHLC is therefore not a reliable closed-market test.

**Why:** The user identified an extended near-horizontal weekend area and asked to remove nontrading periods from the chart. Filtering exact duplicates misses it; filtering all quiet candles would erase genuine low-volatility trading.

**How to apply:** Compress the displayed time axis using an explicit, DST-aware reference weekend session, only removing bars wholly within the closure. Do not alter the provider's original OHLC, assume a universal OTC broker calendar, discard partially open aggregates, or treat quiet intraday trading as a closure. Keep the source, reference-hours disclaimer, and count of hidden candles available on request.

Cached intrabar quotes must not become "confirmed closed" analysis inputs merely because the browser clock passes their scheduled closing time.

**Why:** The source can be polled less frequently than a minute candle's duration. An earlier intrabar snapshot is not the final OHLC, even after that candle's time has elapsed; accepting it can create false confirmations that change on the next fetch.

**How to apply:** Confirm analytical inputs against the data snapshot's fetch time (or an authoritative finalized-candle flag from a future provider). The wall clock may drive a countdown, but cannot manufacture finalized prices.
