---
name: Vercel hosting boundaries
description: Preserve the distinction between Replit-managed runtime integrations and external hosting.
---

When deploying this project outside Replit, explicitly configure its runtime secrets in that host. Gmail Daily Analysis uses the Replit Connectors SDK, whose identity and connector host values are injected by Replit; moving the API code to Vercel alone does not migrate that Gmail connection.

Vercel may independently type-check a TypeScript function's imported Express source using its own NodeNext settings, even when the workspace's API typecheck passes. For this app, expose the existing Express app as a precompiled JavaScript module to the Vercel function instead of importing the TypeScript source directly.

On the deployed Vercel site, the frontend loaded but `/api/access/status` returned Vercel's 404 while the catch-all health request returned a function error. Do not assume a locally working Express catch-all proves nested production API routes are registered.

**Why:** the app can build and serve on Vercel while protected routes still fail at runtime if Replit-only integration context or secrets are absent.

**How to apply:** keep the Vercel frontend/API build independent from Replit-only preview services, use the API package's compiler for the Vercel handler, and probe explicit access endpoints on the public deployment. For the email-only gate, an unsigned short-lived session is acceptable when `SESSION_SECRET` is absent only because each protected request rechecks the public allowlist; this does not verify email ownership. Market data still needs the host's own key, and Gmail analysis needs a separate Google OAuth migration before it can work on Vercel.
