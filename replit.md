# Trading Dashboard

A multi-chart TradingView dashboard for metals, indices, and forex, with saved layouts and a daily Trading Central email-analysis view.

## Run & Operate

- `pnpm --filter @workspace/trading-dashboard run dev` — run the dashboard
- `pnpm --filter @workspace/api-server run dev` — run the API (needed for daily email analysis)
- Daily email analysis requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` in Replit Secrets.
- `pnpm run typecheck` — typecheck all workspace packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, Tailwind CSS
- Charts: TradingView embedded widgets
- API: Express 5, IMAPFlow, Mailparser

## Where things live

- `artifacts/trading-dashboard` — dashboard UI
- `artifacts/api-server/src/routes/email.ts` — Trading Central email fetch and parsing
- `artifacts/api-server/src/routes/health.ts` — API health check

## Architecture decisions

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
