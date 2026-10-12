---
name: Analysis data scope
description: User constraint on the data source for analytical-school features.
---

The user says: "أنا لا أريدك أن تربط بيانات سوق مستقل. الـ chart أمامك من على TradingView." They want analytical schools applied to that chart, including Harmonic and ICT concepts such as Fair Value Gaps, Order Blocks, Premium and Discount.

**Why:** The user explicitly rejected an independent price-feed integration after the automatic-analysis choice was interpreted as permission to add one.

**How to apply:** Do not add an independent market-data provider or request its API key for this feature. After the widget limitation was explained, the user explicitly chose a Pine indicator on the TradingView website, rather than image-based analysis inside the app. Preserve that execution path; do not imply that custom Pine runs inside the embedded widget.
