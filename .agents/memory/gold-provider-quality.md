---
name: Gold provider history quality
description: Source-history irregularities and why invalid gold OHLC must not be silently repaired.
---

Twelve Data XAU/USD history can contain duplicate daily candle-opening timestamps and older monthly rows whose open or close is outside the stated high/low. Successful HTTP responses are not sufficient evidence that every candle is usable.

**Why:** These issues were observed in actual provider responses while building the independent gold chart; rendering them uncritically produces ambiguous candles and misleading indicator calculations.

**How to apply:** Validate source OHLC and UTC times before rendering. Historical omissions must be counted and disclosed; never silently adjust prices or fabricate gap fills. Invalid or ambiguous newest data must fail rather than masquerade as a fresh quote. Keep fetched time separate from candle-opening time.
