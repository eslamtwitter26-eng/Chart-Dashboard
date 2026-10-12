---
name: Gold provider history quality
description: Source-history irregularities and why invalid gold OHLC must not be silently repaired.
---

Twelve Data XAU/USD history can contain duplicate daily candle-opening timestamps and older monthly rows whose open or close is outside the stated high/low. Successful HTTP responses are not sufficient evidence that every candle is usable.

**Why:** These issues were observed in actual provider responses while building the independent gold chart; rendering them uncritically produces ambiguous candles and misleading indicator calculations.

**How to apply:** Validate source OHLC and UTC times before rendering. Historical omissions must be counted and disclosed; never silently adjust prices or fabricate gap fills. Invalid or ambiguous newest data must fail rather than masquerade as a fresh quote. Keep fetched time separate from candle-opening time.

The same source supplies weekend gold quotes with small, nonzero fluctuations, even when spot-gold markets are conventionally closed. Flatness or identical OHLC is therefore not a reliable closed-market test.

**Why:** The user identified an extended near-horizontal weekend area and asked to remove nontrading periods from the chart. Filtering exact duplicates misses it; filtering all quiet candles would erase genuine low-volatility trading.

**How to apply:** Compress the displayed time axis using an explicit, DST-aware reference weekend session, only removing bars wholly within the closure. Do not alter the provider's original OHLC, assume a universal OTC broker calendar, discard partially open aggregates, or treat quiet intraday trading as a closure. Keep the source, reference-hours disclaimer, and count of hidden candles available on request.
