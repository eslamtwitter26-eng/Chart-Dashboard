---
name: Trading Central report selection
description: Keep Daily Analysis focused on recent structured Trading Central technical-analysis emails, not newsletters.
---

Prioritize recent messages whose subject identifies them as Technical Analysis, and inspect successive candidates until one contains real asset cards. Do not display an unrelated newsletter as an empty analysis report.

**Why:** the user's mailbox can have a newer general Trading Central email without asset sections, while the technical-analysis reports contain the instrument sections and chart images. Since reports arrive daily, a recent-week window avoids selecting stale analysis while allowing for weekend gaps.

**How to apply:** keep the specific sender-and-subject search ahead of broad sender fallbacks, skip messages that parse to zero cards, and only cache a report after usable cards are found. Never fabricate missing assets.

**Cross-source recency:** when direct Gmail messages and Outlook-forwarded copies coexist, compare the newest card-filled result from each search instead of stopping at the first search group with cards.

**Why:** an older direct Trading Central email can appear in a sender-specific search before a newer forwarded report appears in a subject search, leaving Daily Analysis stale even though the newer email is already in Gmail.

**How to apply:** preserve search priorities for ties, but select by the parsed message's received time across groups; continue deduplicating message IDs and skipping reports with no cards.

**Mailbox route:** Trading Central mail arrives in Outlook. The approved rule forwards new messages from the Trading Central sender to Gmail while keeping the originals in Outlook; Daily Analysis remains Gmail-backed.

**Why:** the user chose to keep the existing route and wants new reports extracted without manually forwarding each one.

**How to apply:** keep the forwarding rule and Gmail ingestion aligned; do not switch to direct Outlook ingestion unless the user asks.
