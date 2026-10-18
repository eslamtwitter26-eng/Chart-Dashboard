---
name: Trading Central report selection
description: Keep Daily Analysis focused on recent structured Trading Central technical-analysis emails, not newsletters.
---

Prioritize recent messages whose subject identifies them as Technical Analysis, and inspect successive candidates until one contains real asset cards. Do not display an unrelated newsletter as an empty analysis report.

**Why:** the user's mailbox can have a newer general Trading Central email without asset sections, while the technical-analysis reports contain the instrument sections and chart images. Since reports arrive daily, a recent-week window avoids selecting stale analysis while allowing for weekend gaps.

**How to apply:** keep the specific sender-and-subject search ahead of broad sender fallbacks, skip messages that parse to zero cards, and only cache a report after usable cards are found. Never fabricate missing assets.
