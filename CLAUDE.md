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
- Routes in `src/app/` are one-line re-exports of a screen (`export { StandingsScreen as default } from '@/features/standings'`);
  layouts (`_layout.tsx`) stay there. Everything else lives in `src/features`, `src/components`, `src/hooks`, `src/lib`,
  `src/navigation`, `src/state`, `src/widgets`
- **One folder per component or screen**, named in PascalCase, holding everything that belongs to it:
  ```
  features/game/components/ShotChart/
    ShotChart.tsx          the component
    constants.ts           top-level constants it uses (add `use<Name>.ts`, `types.ts`, `<Name>.skeleton.tsx` the same way)
    ShotChart.stories.tsx  its Storybook stories (only if the stories are about this one component)
    index.ts               `export * from './ShotChart'`
  ```
- `features/<name>/` groups one area of the app: `components/` (its building blocks), `screens/` (one folder per screen),
  `stories/` (stories that span several of its components), `utils/` (helpers shared by its components), and an `index.ts` that exports
  `components` and `screens`. Features: `calendar compare cup game home intro leaders onboarding player playoffs search standings team watchlist`
- `components/` is only for pieces used by several features: `Screen` (header, loading/error states), `Segmented`, `Collapsible`, `Expandable`,
  `RollingNumber`, `LiveFlash`, `UpdatedAgo`, `DataHealthBanner`, `SeasonPicker`, `Form` (W/L dots and chips), `HeadToHead`, `Icons`, `Basketball`, `NbaLogo`, `TeamMark`
- Import rule (ESLint enforces it): use a folder's index, never a file inside it. From outside a feature: `@/features/game`; shared UI:
  `@/components`; also `@/lib/espn`, `@/hooks`, `@/state`. Inside a feature: a sibling component is `../ShotChart`, a screen
  reaches the feature's components via `../../components`. A new component = new folder + add it to the feature's `components/index.ts`.
  A feature may use another feature only through its index (e.g. `team` uses `@/features/watchlist`); keep these acyclic.
- `lib/`: `espn/` (client, teams, schedule, standings, game, scoreboard, players, player-profile, team-stats, tagged), `game/`
  (game-model, quarter-stats, period-stats), `league/` (bracket, cup, team-stats, titles), `theme/` (colors + team marks); `date.ts`
  and `data-health.ts` stay single files
- `navigation/` (`openDetail`, depth tracker), `widgets/` (iOS widget; no barrel because `next-game-widget.tsx` can't load in Node)
- Colors come from `teamTheme(team)` in `src/lib/theme`; don't hard-code team colors
- Pick logos with `logoOn(team, onColor)` so they read on dark or light backgrounds
- Fonts: `fonts.display` (Big Shoulders Display) for headlines and numbers, Barlow for body
- Animations run on the UI thread; avoid React state inside gesture or sensor callbacks
- No icon library is installed; icons are hand-drawn SVGs in `src/components/Icons`

## Data
ESPN endpoints are undocumented and may change. All parsing lives in
`src/lib/espn.ts`. If a field shows "–" in the UI, inspect the live response
and fix the normalizer there rather than in components.

Per-quarter and per-half player/team stats are not in ESPN's box score. `src/lib/game/quarter-stats.ts`
rebuilds them from the play-by-play feed (`Play[]` from `fetchGameSummary`), and it also powers the
win-probability chart and play-by-play tab. Check accuracy against a game with
`node --experimental-strip-types --import ./tests/register.mjs scripts/validate-quarter-stats.ts <gameId>`; counting stats match
the box score, derived plus-minus can drift by ±1.

Other data sources beyond the main ESPN site API: the common/v3 `gamelog` and `search` endpoints
(player game log, player search for Compare) and core-API team statistics (home screen team season card).
Team ranks (home card, Compare > Teams) are computed in `src/lib/team-stats.ts` from the one-call
`statistics/byteam` feed (`fetchLeagueTeamStats`); ESPN's own per-team `rank` fields are unreliable for
derived stats like 3P%. Player career tables come from the common/v3 athlete `stats` endpoint.
Scoreboards are keyed by US Eastern date, so use `nbaToday()` / `toNbaDateKey()` from `src/lib/date.ts`
(not the device date) for "today" and for placing a game on a day.
Worklet gotcha: never call plain JS helpers (e.g. `withAlpha`) inside `useAnimatedStyle`, and don't use
object spread in gesture hook configs; neither shows up in `tsc`, both crash at runtime.
React Query's cache is persisted to AsyncStorage for slow-changing keys only (see `PERSISTED` in `src/app/_layout.tsx`).

## Pregame, form and head-to-head
`normalizeGameSummary` returns `pregame` (`winProb` from ESPN's matchup predictor, `odds` from `pickcenter` when a book has posted a line,
`form` = last five results per team from `lastFiveGames`). Odds are US moneylines converted to decimal (`moneylineToDecimal`); many games
have no line yet, so every part is optional and the card hides what's missing. There is no head-to-head feed: `fetchHeadToHead` reads one
team's regular-season and playoff schedules season by season until it has 10 finished meetings (`summarizeHeadToHead` in `lib/league`).
The Summary tab shows odds, form and head-to-head before tip-off; Compare > Teams shows head-to-head too.
A player link carries the team he played for in that game; when that roster no longer has him (traded, retired, never signed) `PlayerScreen` builds the page from `fetchPlayerBio` (the athlete record), so anyone ESPN knows can be opened. The game log merges regular season and playoffs (`playoffs` flag).

## NBA Cup
ESPN has no Cup standings feed, but Cup games carry a note ("NBA Cup - Group Play") in schedules, scoreboards and
game summaries (`cupStage`). `fetchCupGames` reads all 30 team schedules (future games included); `src/lib/cup.ts`
rebuilds the six groups from who plays whom and computes standings (wins, head-to-head, point differential) and the
projected eight-team field. Group letters aren't published, so groups are numbered "East 1".. "West 3".

## Seasons, playoffs and brackets
Standings, Playoffs (with Play-In) and NBA Cup are separate drawer screens, each with a season picker (Standings back to 2000-01, Playoffs to 2009-10 where ESPN's notes name the round, Cup to 2023-24). Past-season
standings come from `site.api.espn.com/apis/v2/.../standings?season=YYYY` (a different shape; `fetchStandings`
handles both). Playoff and play-in games are tagged by note in team schedules (`?season=&seasontype=3|5`), the
same trick as the Cup: `fetchTaggedGames` collects them, `src/lib/bracket.ts` builds series, rounds and tree layout
(seeds 7 and 8 are inferred as 9 minus the top seed). `Bracket` shows Rounds or a drawn tree; tap a series for games.
Finished seasons are cached forever and persisted (see `shouldPersist`).

## Storybook
On-device Storybook (React Native, v10) is opt-in: `npm run storybook` starts Metro with
`EXPO_PUBLIC_STORYBOOK_ENABLED=true`, which adds a "Storybook" item to the drawer (route `/storybook`).
Without the flag, `metro.config.js` swaps every Storybook module for a stub, so the normal bundle carries none of it.
Stories live next to components (`src/**/*.stories.tsx`) and use real data from `src/storybook/fixtures.ts`
(the recorded ESPN fixtures run through the app's normalizers). `.rnstorybook/storybook.requires.ts` is
generated by Metro; don't edit it. Add a story whenever you add a reusable component.

Player honors/contract/draft come from `fetchPlayerProfile` (core API, Info tab). ESPN has no All-Star
selections or championship counts: titles are derived in `src/lib/titles.ts` from a hard-coded list of
champions matched against each career season's team, so add the new champion there every June.

iOS widgets live in `src/widgets/` via `expo-widgets`: next game (a timeline, with a live state), team form (last five) and upcoming fixtures (list). Each widget file is pure and declares a `SAMPLE_*` fixture that the gallery shows; `ios.initialLayout` in `app.json` embeds the layout at build time so the gallery and a never-opened widget render. `sync.ts` pushes data for all three when the favorite team's data changes. A new widget = a file with `createWidget`, an entry under `expo-widgets` in `app.json`, a builder in `snapshots.ts` and a test, then `expo prebuild` and `pod install`. It needs a
development build (not Expo Go), a real bundle id, Apple team id and app group in `app.json`; `<WidgetSync />`
pushes the timeline from the app. Not yet verified on a device.

## Loading, transitions and gestures
- Loading states are skeletons, not spinners: `Skeleton` / `SkeletonGroup` (one shared pulse) and `ListSkeleton` in `src/components`, plus screen-shaped ones next to their feature (`PlayerSkeleton`, `GameSkeleton`). Query `isPending` decides; never show an empty state while data is still loading.
- Shared-element transitions use Reanimated's `sharedTransitionTag` (static flag `ENABLE_SHARED_ELEMENT_TRANSITIONS` in `package.json`, native rebuild needed). The list adds `o=<origin>` to the link and tags with `sharedTag(origin, ...)` from `@/navigation`; the destination reads `o`. Currently: Standings logo to team page, Scores strip logos and scores to the game.
- Hold the home team card to open `TeamSwitcher`; the Shots tab animates heat zones outward from the rim (`HeatLayer`) and a tap on a shot shows who took it and when.

## Before calling a task done
```bash
npx tsc --noEmit
npx eslint src
npm test   # node:test against recorded ESPN fixtures in tests/fixtures
```
Tests run on Node's type stripping plus `tests/register.mjs`, a resolver hook that understands the `@/` alias, extensionless
paths and folder barrels, so tests import like the app does (`../src/lib/espn`). Only modules Node can load work: no React Native,
Expo or JSX (that is why `widgets/timeline.ts` is pure). ESPN normalizers are exported (`normalizeGameSummary`, `normalizeLeagueTeamStats`)
so they can be tested without the network; `setHealthReporter` feeds the in-app "ESPN's data looks different" banner.
The game screen (`src/features/game`) is split into tab components; the analytics (runs, lead changes, four factors)
live in `src/lib/game/game-model.ts`. Finished games are persisted for offline (see `shouldPersist` in `src/app/_layout.tsx`).

## Status
Built and type-checked but not yet run on a device. First job: run it,
fix any runtime errors, and confirm the ESPN response shapes match `espn.ts`.
