# Invoice Anomaly Desk: Frontend

React app for reviewing supplier invoices flagged by the AI agent.
Built for the Vultr: Agent Rush Hackathon (lablab.ai).

## Tech

React, Vite, Tailwind CSS, React Router, Recharts, Lucide icons.

## Run locally

```
npm install
npm run dev
```

Open http://localhost:5173

## Mock data or real API

Settings are in `.env`:

```
VITE_USE_MOCK=true
VITE_API_URL=
```

- `VITE_USE_MOCK=true`: fake data from `src/data/mockData.js`
- `VITE_USE_MOCK=false`: real backend through `src/lib/realApi.js`
- `VITE_API_URL`: backend address. Leave empty when the API is served
  from the same domain (production on the Vultr VM).

Restart `npm run dev` after changing `.env`.

## Pages

Dashboard, Upload, Invoices, Invoice detail, Review queue,
Vendors and POs, Audit log.

## Build for production

```
npm run build
```

The static files are created in `dist/` and served by Nginx.

## Folders

```
src/components   reusable pieces (cards, pills, layout)
src/pages        the 7 screens
src/lib          API code and helpers
src/data         mock data
```