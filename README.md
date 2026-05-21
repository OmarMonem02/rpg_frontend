# RPG Frontend

Next.js client for the Real Performance Garage ERP system. The frontend provides staff workspaces for inventory, sales, maintenance, customers, users, permissions, reporting, and public customer ticket tracking.

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query for server state
- Recharts for reporting visuals
- Vitest and Testing Library for unit tests
- jsPDF and html2canvas for printable/exportable documents

## Core Features

- Protected staff workspace with session-aware routing
- Inventory management for bikes, products, spare parts, brands, categories, and maintenance services
- Sales workflows with catalog selection, returns, exchanges, receipts, and invoices
- Maintenance ticket management with tasks, parts, notes, payment state, and tracking-link actions
- Public `/track/[token]` customer tracking page with phone verification
- Customer profiles and workspaces
- User administration and permission editing
- Reporting dashboards for profit/loss, annual summaries, balance sheet, and expenses
- Import/export screens for operational data

## Requirements

- Node.js 20 or newer
- npm
- Running RPG backend API

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Configure the backend API URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL for the Laravel API. Defaults to `http://127.0.0.1:8000/api` in development when unset. |

Production builds use the configured environment value when present. If it is omitted, the app falls back to the production API URL defined in `src/lib/config.ts`.

## Available Scripts

```bash
npm run dev
```

Starts the local Next.js development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Serves the production build.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run test
```

Runs the Vitest test suite once.

```bash
npm run test:watch
```

Runs Vitest in watch mode.

## Project Structure

```text
src/app
  App Router routes, layouts, protected pages, and public tracking pages

src/components
  Shared UI, workspace components, tickets, reporting, history, imports, and printable views

src/hooks
  Reusable hooks for API data and workspace refresh behavior

src/lib
  API clients, auth/session helpers, permissions, formatting, and domain utilities

src/types
  Shared TypeScript API and domain types
```

## Backend Integration

The app communicates with the Laravel API through typed helpers under `src/lib/api` and shared request utilities in `src/lib/crud-api.ts`.

Authentication is token-based. Protected screens depend on the backend `/api/me` endpoint and permission metadata to determine available navigation and actions.

Customer ticket tracking uses the public backend endpoints under `/api/public/tickets/{token}`. The public page is available at:

```text
/track/[token]
```

## Testing

Run frontend tests:

```bash
npm run test
```

The current test setup uses Vitest, jsdom, Testing Library, and shared setup from `src/test/setup.ts`.

## Related Project

The matching Laravel API is located at `../rpg_backend`.
