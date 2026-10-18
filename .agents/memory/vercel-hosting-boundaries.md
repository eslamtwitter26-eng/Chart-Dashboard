---
name: Vercel hosting boundaries
description: Preserve the distinction between Replit-managed runtime integrations and external hosting.
---

When deploying this project outside Replit, explicitly configure its runtime secrets in that host. Gmail Daily Analysis uses the Replit Connectors SDK, whose identity and connector host values are injected by Replit; moving the API code to Vercel alone does not migrate that Gmail connection.

Vercel may independently type-check a TypeScript function's imported Express source using its own NodeNext settings, even when the workspace's API typecheck passes. For this app, expose the existing Express app as a precompiled JavaScript module to the Vercel function instead of importing the TypeScript source directly.

On the deployed Vercel site, the frontend loaded but `/api/access/status` returned Vercel's 404 while the catch-all health request returned a function error. Do not assume a locally working Express catch-all proves nested production API routes are registered.

The user chose to keep Gmail connected through Replit and have Vercel proxy access and email requests to the published Replit API. Do not migrate Daily Analysis to Vercel Google OAuth unless the user changes this decision.

**Why:** the app can build and serve on Vercel while protected routes still fail at runtime if Replit-only integration context or secrets are absent.

**How to apply:** keep Vercel's frontend same-origin API routes as a proxy to the published Replit API, forwarding the access cookie; configure `REPLIT_API_BASE_URL` in Vercel after Replit publishes the project. Replit publishing includes all artifacts, so the API retains its Gmail connector. Probe explicit endpoints on the public deployment. For the email-only gate, an unsigned short-lived session is acceptable when `SESSION_SECRET` is absent only because each protected request rechecks the public allowlist; this does not verify email ownership.
