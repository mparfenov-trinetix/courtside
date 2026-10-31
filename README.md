# Courtside

NBA team cards built with Expo SDK 58. A practice project focused on animation:
an intro that continues from the native splash, a team picker, and a team card
that tilts with the phone's motion sensor.

Data comes from ESPN's public (undocumented) NBA endpoints. No API key, no login.

## Run it

```bash
npm install
npx expo start          # works in Expo Go
```

Everything runs in Expo Go. The custom native splash only appears in a
development build:

```bash
npx expo run:ios        # or run:android
```

## Where things live

- `src/app/index.tsx`: intro animation (ball bounce, court lines, wordmark)
- `src/app/onboarding.tsx`: favorite team picker
- `src/app/(drawer)/`: drawer menu, home card, all teams, roster
- `src/components/team-card.tsx`: the tilting card (shadow, sheen, rim lights, corner glints)
- `src/hooks/use-tilt.ts`: gravity sensor + drag-to-tilt; flip `INVERT_X` / `INVERT_Y` if the card leans the wrong way
- `src/lib/espn.ts`: ESPN client, every response normalized into small local types
- `src/lib/theme.ts`: palette, fonts and per-team color theming
