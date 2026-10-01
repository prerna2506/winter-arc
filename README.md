# Winter Arc

A local-first personal tracker for the 151-day challenge from October 1, 2026 through February 28, 2027.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Included

- Daily habit check-ins with editable, reorderable, and custom habits
- Challenge calendar with daily completion levels and date selection
- Current and best streaks, days shown up, overall completion, and sleep average
- Bedtime and wake-time tracking with overnight duration calculation
- Weekly check-ins and monthly reflections
- Responsive desktop and mobile layouts

All tracker data is stored in this browser's `localStorage`. There is no account, server database, or cross-device sync in this version. Clearing browser storage removes the saved tracker data.

## Scripts

- `npm run dev` starts the development server.
- `npm run lint` checks the code with ESLint.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
