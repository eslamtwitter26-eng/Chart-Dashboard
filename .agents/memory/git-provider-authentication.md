---
name: Git provider authentication
description: Distinguishing GitHub integration status from native workspace Git authorization.
---

A healthy GitHub integration status does not guarantee that workspace `git` or `gh` can authenticate. Verify the native transport before assuming a push is authorized.

**Why:** The integration reported active and healthy, but Git rejected authentication and the GitHub CLI had no login. The integration authorization forms could not open.

**How to apply:** If this mismatch occurs, ask the user to reconnect GitHub through Replit account settings under Git Providers, as the official documentation recommends, rather than only Connected Services. Never request tokens in chat or work around authentication by handling credentials manually.
