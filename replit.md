# Trading Dashboard

A multi-chart TradingView dashboard for metals, indices, and forex, with saved layouts and a daily Trading Central email-analysis view.

## Run & Operate

- `pnpm --filter @workspace/trading-dashboard run dev` — run the dashboard
- `pnpm --filter @workspace/api-server run dev` — run the API (needed for daily email analysis)
- Daily email analysis uses the connected Gmail integration; it only searches Trading Central messages.
- `pnpm run typecheck` — typecheck all workspace packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, Tailwind CSS
- Charts: TradingView embedded widgets
- API: Express 5, Replit Connectors SDK, Mailparser

## Where things live

- `artifacts/trading-dashboard` — dashboard UI
- `artifacts/api-server/src/routes/email.ts` — Trading Central email fetch and parsing
- `artifacts/api-server/src/routes/health.ts` — API health check

## Architecture decisions

- Daily Analysis reads only matching Trading Central messages through the connected Gmail OAuth integration; it does not use an app password.
- Show one card per asset with its timeframe, email chart image, pivot/trigger, preference, alternative scenario, and comment.
- The observed European Session report labels every chart `30 MIN`; when the email text omits a timeframe, the parser uses this report-specific fallback.
- Do not publish the Gmail-backed endpoints publicly until app-level authentication is added.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
