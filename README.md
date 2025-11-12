# Conflict Dashboard

An open-source dashboard for tracking and analyzing conflicts around the world, powered by the UCDP API. Users can view active events on a world map, click through to a customizable dashboard, and add data-driven tiles (e.g., numbers, RSS, maps, and more).

## Features (MVP)

- Homepage world map with last-12-month UCDP GED events
- Click a map event to open a dashboard for that conflict
- Draggable, resizable dashboard tiles with local persistence
- First data tile: Numbers (events and fatalities over the last 12 months)

Planned: marker clustering, highlight major conflicts, RSS tile via edge function, Supabase auth and DB persistence, more tiles (AI summary, podcasts, population layers, etc.).

## Tech Stack

- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS (v4)
- Map: Leaflet (react-leaflet)
- Dashboard grid: react-grid-layout
- Data: TanStack Query

## Getting Started (Local)

Prereqs: Node.js 20+ and npm

1) Install and run the web app

```
cd web
npm install
npm run dev
```

Open the URL Vite prints (e.g., http://localhost:5173 or http://localhost:5176).

2) Troubleshooting

- Tailwind v4 PostCSS error: Ensure `@tailwindcss/postcss` is installed and `postcss.config.js` uses it. Restart the dev server after changes.
- CORS when calling UCDP: A Vite dev proxy is configured; always run the dev server from the `web` folder so the proxy is active.
- Update loop on dashboard: If you ever see a blank page, clear saved layouts in the console: `Object.keys(localStorage).filter(k => k.startsWith('layout:')).forEach(k => localStorage.removeItem(k))`

## Repository Structure

```
conflictDashboard/
  .github/
    workflows/ci.yml       # CI for lint/build on PRs
  web/                     # Vite React app (all source lives here)
    src/
      pages/               # Home (map), Dashboard
      tiles/               # Tile components (Numbers, etc.)
      hooks/               # React Query data hooks
      lib/                 # UCDP client
  LICENSE
  CONTRIBUTING.md
  README.md
```

## Data Attribution

This project uses the Uppsala Conflict Data Program (UCDP) datasets via their public API. Please review their Terms of Use and attribution guidance: https://ucdp.uu.se/apidocs/

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development, code style, and PR guidelines.

## License

MIT. See [LICENSE](./LICENSE).
