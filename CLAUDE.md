@AGENTS.md

# Courtside: project notes for Claude Code

Practice app, not shipping to stores. The owner is an experienced React Native
developer who wants to explore animations and native features.

## Stack
- Expo SDK 58, React Native 0.88, React 19.3, React Compiler on
- Expo Router 58 (drawer is built into `expo-router/drawer`, no @react-navigation/drawer)
- Reanimated 4.7 + react-native-worklets (`scheduleOnRN`, not `runOnJS`)
- Gesture Handler 3.3: use the hook API (`usePanGesture`, etc.) with `GestureDetector`
- TanStack Query for ESPN data, AsyncStorage for the favorite team

## Conventions
- Routes in `src/app/`, everything else in `src/components`, `src/hooks`, `src/lib`, `src/state`
- Colors come from `teamTheme(team)` in `src/lib/theme.ts`; don't hard-code team colors
- Pick logos with `logoOn(team, onColor)` so they read on dark or light backgrounds
- Fonts: `fonts.display` (Big Shoulders Display) for headlines and numbers, Barlow for body
- Animations run on the UI thread; avoid React state inside gesture or sensor callbacks
- No icon library is installed; icons are hand-drawn SVGs in `src/components/icons.tsx`

## Data
ESPN endpoints are undocumented and may change. All parsing lives in
`src/lib/espn.ts`. If a field shows "–" in the UI, inspect the live response
and fix the normalizer there rather than in components.

Per-quarter and per-half player/team stats are not in ESPN's box score. `src/lib/quarter-stats.ts`
rebuilds them from the play-by-play feed (`Play[]` from `fetchGameSummary`), and it also powers the
win-probability chart and play-by-play tab. Check accuracy against a game with
`node --experimental-strip-types scripts/validate-quarter-stats.ts <gameId>`; counting stats match
the box score, derived plus-minus can drift by ±1.

Other data sources beyond the main ESPN site API: the common/v3 `gamelog` and `search` endpoints
(player game log, player search for Compare) and core-API team statistics (home screen team season card).
React Query's cache is persisted to AsyncStorage for slow-changing keys only (see `PERSISTED` in `src/app/_layout.tsx`).

## Before calling a task done
```bash
npx tsc --noEmit
npx eslint src
```

## Status
Built and type-checked but not yet run on a device. First job: run it,
fix any runtime errors, and confirm the ESPN response shapes match `espn.ts`.
