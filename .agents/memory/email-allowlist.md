---
name: Manual email allowlist
description: Product policy for customer access through the public email list.
---

The owner manually adds or removes a customer's email in the shared Google Sheet after speaking with them. Access is by entering a matching email only; the user explicitly chose no password or mailbox verification.

**Why:** The user wants the sheet to control who can open the dashboard and asked that removing an address revoke access.

**How to apply:** Treat the sheet as the source of truth, fail closed if it cannot be read, protect the app APIs, and keep logout available. Do not describe email entry as proof of identity: because the sheet is public, anyone can copy a listed address and enter it. Do not silently add password or code verification unless the user asks.
