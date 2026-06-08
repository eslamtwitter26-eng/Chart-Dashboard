---
name: Gmail IMAP setup
description: Correct credentials and gotchas for the trading dashboard Gmail IMAP email fetcher
---

The correct Gmail address for the Daily Analysis email fetcher is `eg.financefx@gmail.com` (with the `eg.` prefix). Using `financefx@gmail.com` (without the prefix) causes AUTHENTICATIONFAILED.

**Why:** User's actual Gmail has the `eg.` prefix — it was initially misread as "e.g." (for example) but is part of the address.

**How to apply:** GMAIL_USER env var must be `eg.financefx@gmail.com`. Already set correctly after this fix.

**Other gotchas:**
- Gmail App Passwords include spaces (groups of 4 letters) — must strip spaces with `.replace(/\s/g, "")` before passing to imapflow
- imapflow and mailparser must be in the esbuild `external` array in `build.mjs` — they use dynamic CJS requires that can't be bundled
- Gmail IMAP must be enabled: Settings → See All Settings → Forwarding and POP/IMAP → Enable IMAP
- App Passwords require 2-Step Verification to be active on the Google account
- Gmail OAuth connector requires a paid Replit plan — not available on free tier
