# Contributing

Thanks for your interest in contributing! This project welcomes issues, feature requests, and pull requests.

## Development

- Prerequisites
  - Node.js 20+
  - npm (or pnpm/yarn)
- Install and run
  - cd web
  - npm install
  - npm run dev

## Code style

- TypeScript, React, Vite
- ESLint and Prettier are configured in the web app
- Prefer functional, typed React components and React Query for data fetching

## Commit hygiene

- Small, focused commits with clear messages
- Reference issues with #<number> when relevant

## Pull requests

- Keep PRs focused and under ~400 lines when possible
- Include screenshots/gifs for UI changes
- Ensure `npm run lint` and `npm run build` pass in /web

## Attribution and data ethics

- This project uses the UCDP API. Please respect their Terms of Use and attribution requirements.
- Do not hardcode API keys. Use environment variables for private keys in future tiles.
