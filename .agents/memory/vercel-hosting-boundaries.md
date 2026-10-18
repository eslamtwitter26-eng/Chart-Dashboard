---
name: Vercel hosting boundaries
description: Preserve the distinction between Replit-managed runtime integrations and external hosting.
---

When deploying this project outside Replit, explicitly configure its runtime secrets in that host. Gmail Daily Analysis uses the Replit Connectors SDK, whose identity and connector host values are injected by Replit; moving the API code to Vercel alone does not migrate that Gmail connection.

Vercel may independently type-check a TypeScript function's imported Express source using its own NodeNext settings, even when the workspace's API typecheck passes. For this app, expose the existing Express app as a precompiled JavaScript module to the Vercel function instead of importing the TypeScript source directly.

**Why:** the app can build and serve on Vercel while protected routes still fail at runtime if Replit-only integration context or secrets are absent.

**How to apply:** keep the Vercel frontend/API build independent from Replit-only preview services, use the API package's compiler for the Vercel handler, require the host's own `SESSION_SECRET` and market-data key, and plan a separate Google OAuth migration before claiming Gmail analysis works on Vercel.
