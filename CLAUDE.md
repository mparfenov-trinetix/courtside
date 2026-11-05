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
  `RollingNumber`, `LiveFlash`, `DataHealthBanner`, `SeasonPicker`, `SearchInput` (search field with a hand-drawn placeholder: iOS puts TextInput's own placeholder below the caret with a custom font), `Form` (W/L dots and chips), `HeadToHead`, `Icons`, `Basketball`, `NbaLogo`, `TeamMark`
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
Scoreboards are keyed by US Eastern date (`toNbaDateKey()`), but days on screen are the device's own: `useGamesOnDay(day, today)` reads the one or two scoreboards that hold a local day (`scoreboardKeysFor`) and keeps the games that start on it (`startsOnDay`); on today a game that is on right now is listed too, even if it started the evening before. The Calendar day pages, Month cells, home scores strip and "today" (`localToday()`) all use it. Only the Live Activity and the widgets still think in Eastern dates (the Activity reads both today's and yesterday's board).
Worklet gotcha: never call plain JS helpers (e.g. `withAlpha`) inside `useAnimatedStyle`, and don't use
object spread in gesture hook configs; neither shows up in `tsc`, both crash at runtime.
React Query's cache is persisted to AsyncStorage for slow-changing keys only (see `PERSISTED` in `src/app/_layout.tsx`).

## Pregame, form and head-to-head
`normalizeGameSummary` returns `pregame` (`winProb` from ESPN's matchup predictor, `odds` from `pickcenter` when a book has posted a line,
`form` = last five results per team from `lastFiveGames`). Odds are US moneylines converted to decimal (`moneylineToDecimal`); many games
have no line yet, so every part is optional and the card hides what's missing. There is no head-to-head feed: `fetchHeadToHead` reads one
team's regular-season and playoff schedules season by season until it has 10 finished meetings (`summarizeHeadToHead` in `lib/league`).
The Summary tab shows odds, form and head-to-head before tip-off; Compare > Teams shows head-to-head too.
All-Star selections are not in ESPN's awards (only the All-Star MVP): `fetchAllStars` reads each All-Star Game's roster from its scoreboard day (2003 on, dates in `lib/espn/all-star.ts`, add the new February each year) and `HonorsCard` shows them as "NBA All-Star". The playoff bracket is one tree (East above West, Finals as the last column, `BracketSection.byConference`); the play-in is a per-conference bracket (7v8 and 9v10 feed the 8th seed game).
Every game links to Standings (`openStandings(teamIds, date)` in the game feature): the screen reads `teams` (comma separated ids, highlighted in matchup colors, opens the shared conference or the league table and scrolls to them) and `season` params. Before tip-off the Summary tab shows the standings card (same conference: that table with both rows lit; different: each team's place).
The drawer (`components/DrawerMenu`) is grouped into what is yours (no heading: Team card, Calendar, Watchlist, which holds players and games alike), League (Standings, Player leaders, Team leaders = teams ranked by a team stat, Rosters = all 30 teams in a pager, Teams = the team picker, Compare = players or teams) and Tournaments (`SECTIONS`) with a search entry on top (opens `/search`). Team card and Calendar are the two main screens: a Calendar button sits beside the menu on the Team card (`ScreenHeader`'s `afterMenu`); the Calendar has no button back, the menu is its way out; `SceneFrame` also settles each screen in when you reach it (content eases from 22pt right to rest over 520 ms with an ease-out quint curve, no scale, and the fade is a veil in the menu color over the screen, not the screen's own opacity (that forced an offscreen render of every card per frame), started two animation frames after the screen's first draw so a heavy first render does not eat the start of the move; the first screen after launch skips it, the intro hands over, and it plays for every deliberate trip to a drawer screen (menu or any button, plain `router.navigate`), but not when a game, player or team page on top of it closes and the same screen shows again (`returningFromDetail` in `@/navigation`, with `lastScene` in `SceneFrame` so a button on a detail page that goes to a different screen still slides): returning to a screen from a game or player page also focuses it, and sliding it in then looked like the menu dragging open; opacity never starts at 0 or the menu's color would show), `SceneFrame`, wired through the drawer's `screenLayout` (a module-level function: an inline one rebuilds every screen), draws corners, shadow and edge on top of each screen while the menu is open, without clipping the screen (clipping made opening screens lag). Standings opened from a game is the pushed `/matchup-standings` route, so back returns to the game. The drawer's edge swipe is only on while a drawer screen is on top (`swipeEnabled` from `useSegments()[0] === '(drawer)'` in `(drawer)/_layout.tsx`): a game, player or team page opened over it leaves the drawer mounted underneath, whose edge swipe would otherwise catch the back swipe and drag the screen below open like the menu. A new screen = a route file, a `Drawer.Screen`, and an entry in `SECTIONS`.
The Rosters screen (`RosterScreen`) is a horizontal pager with one page per team (`TeamRoster`), alphabetical, opening on the team you are viewing. Its position is a fractional `page` shared value: the screen background (the team's color, header included), the `TeamPills` strip with its team-colored outline and the strip's own scroll all follow it. Performance rules: only five pages are mounted (`windowSize={5}`); a move of more than two teams jumps the pager in one step while `page` is animated separately (`jumping`), instead of scrolling through pages; rows are built only for the page last settled on and its neighbours, every other page shows the static `RosterSkeleton` (no pulsing skeletons: dozens of animated views per page); once at rest, rosters and first headshots of the teams two swipes either way are prefetched into the React Query cache. Swiping does not change the app's selected team.
A player link carries the team he played for in that game; when that roster no longer has him (traded, retired, never signed) `PlayerScreen` builds the page from `fetchPlayerBio` (the athlete record), so anyone ESPN knows can be opened. The game log merges regular season and playoffs (`playoffs` flag).

Calendar Month and Agenda read whole seasons: `fetchTeamSeason` / `useSeasonGames(teamId, season)` merge a team's regular season, play-in and playoffs (the month in view picks the season, Agenda has a season button), so old months fill in; day view reaches any date through the scoreboard. Finished seasons are cached forever.
Month also marks the All-Star Game (ESPN's NBA logo with a gold star) and NBA Finals games (a hand-drawn Larry O'Brien trophy, `LarryOBrienIcon`; ESPN has no trophy or All-Star artwork) for every team (`calendarEvents` in `lib/league`): the All-Star day comes from the hard-coded list in `lib/espn/all-star.ts`, the Finals games from the season's playoff notes (read only for months that can hold a Finals).

Starring: players and games both go to the Watchlist (`useWatchlist`: `players` / `toggle`, `games` / `toggleGame`, each persisted under its own AsyncStorage key). The game star sits in the game page's top bar (`GameTopBar`, right side, stays in the compact bar); a `WatchedGame` keeps both teams' abbreviation and logo and the start time so the Watchlist screen can list it at once, then `WatchGame` fills in the score and status from the game's own (cached) summary. The favorite-team screen says "Keep" instead of "Make" for the team that is already yours.

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

Splash: the native splash image (`assets/images/splash-icon.png`) is the same shaded ball the intro draws with `components/Basketball` (same geometry: lit from the top left, darker rim, highlight, 3.4-wide seams), so the hand-over is invisible; change one, change the other (the PNG was rendered from that geometry; a native rebuild is needed to see a new splash image). The intro adds the arena light (a soft pool of the court color) and a ring of light leaving the center circle as it closes.
Cold starts: `SplashScreen.preventAutoHideAsync()` keeps the native splash up until the intro paints, but a cold start straight onto another page (widget, Dynamic Island, link) never mounts the intro, so `_layout.tsx` also hides the splash once the app is ready on any page other than `/` (and after 5 s as a last resort). Live data: pages poll from `soon` (20 min before tip-off) and look at the clock again each minute while a game is still to be played (`useMinuteTick`); when a game on the board turns final, `refreshAfterFinal` refreshes what it changes (schedule, record, form, standings, leaders). The Dynamic Island only moves while the app is open; the Next game widget shows the live score and clock of your team's game while the app is open (`liveScoreOf`, passed to `buildTimeline`; the same cached game query as the activity), but with the app closed it still shows the tip-off time.

NBA 2K ratings: only the real, published ones. 2K publishes its Top 100 overalls (https://nba.2k.com/2k27/top-100-ratings/) and nothing else (no public feed, no attributes for the rest of the league), so `lib/league/nba2k-ratings.ts` holds that list (launch ratings, matched by normalized name with `nba2kRating`) and `RatingCard` (headed by 2K's own NBA 2K27 logo, `assets/images/nba-2k27-logo.png`, taken from nba.2k.com; a practice app, not for distribution) shows it at the bottom of the player's Season tab as a trading card: it tilts like the team and player cards (`useTilt`), and when scrolled into view (measured against the page's `scrollY`) it flips in and the overall counts up once and Compare adds a "NBA 2K27 overall" row, only for Top 100 players. Do not invent ratings from ESPN stats (an earlier stat-based model was rejected: they must be real numbers). The game page's header collapse finishes itself: a scroll that comes to rest inside it snaps to the top or the collapsed bar (`settle` in `GameScreen`), and the hero's clock/timeout/heat labels fade before the top bar shows them, so the same information is never on screen twice.

Game page extras: a light gold "B" at a team logo's bottom left means it is in the bonus (live only, `fouls.bonus`; hidden as the header collapses); the head-to-head card shows while a game is live too (not on a finished one); the injury report (ESPN only has today's) shows only for scheduled and live games, never a finished one. The Rosters pages build their rows only once the pager is at rest (`steady`), a skeleton holds the place until then.

Live Activity (Dynamic Island + lock screen): `src/widgets/live-game-activity.tsx` (`createLiveActivity('LiveGameActivity', ...)`: banner, compact leading/trailing "PHI 53 | 42 DET", minimal, expanded with a "DET TO" timeout pill) is fed by `buildLiveGameProps` (`live-game.ts`, pure, tested) and driven by `syncLiveActivity` (`live-activity.ts`: start when the game is on, update on every score, end with the final left up 15 minutes). `useLiveActivity` (mounted in `WidgetSync`; it reads today's scoreboard and yesterday's, because ESPN files a game under the Eastern day it started on, so an evening game is still yesterday's after Eastern midnight, early morning in Europe) follows your favorite team's live game, else a starred live game, else puts up a final from today (`pickTrackedGame`). Live Activities need no `widgets[]` entry; `frequentUpdates` is on in `app.json`. With the app closed the activity only moves if a server pushes to it (`enablePushNotifications` needs a paid Apple team: the activity's `getPushToken()` and `addPushToStartTokenListener` are the hooks for the backend). Live data polling starts 20 minutes before tip-off (`gamePhase` in `lib/game/live-poll.ts`), not only once a game is live; a page that comes back into view refreshes at once if its data is stale.

iOS widgets live in `src/widgets/` via `expo-widgets`: next game (a timeline, with a live state), team form (last five) and upcoming fixtures (list). Each widget file is pure and declares a `SAMPLE_*` fixture that the gallery shows; `ios.initialLayout` in `app.json` embeds the layout at build time so the gallery and a never-opened widget render. `sync.ts` pushes data for all three when the favorite team's data changes. A new widget = a file with `createWidget`, an entry under `expo-widgets` in `app.json`, a builder in `snapshots.ts` and a test, then `expo prebuild` and `pod install`. It needs a
development build (not Expo Go), a real bundle id, Apple team id and app group in `app.json`; `<WidgetSync />`
pushes the timeline from the app. Not yet verified on a device.

## Form, clutch, leaders and Lock Screen
League Leaders (`LEADER_CATEGORIES` in `lib/espn/leaders.ts`, one table: ESPN category name plus how its value is read) has PPG, RPG, APG, STL, BLK, 3PM, 3P%, FG%, FT%, TOV, DD, MPG, PF and two tabs worked out in the app. ESPN sends 3P% as a fraction (rescaled in the table) and its PER has no minutes qualifier (89.2 for a rotation player), so PER is not shown: the EFF tab computes classic efficiency per game (`efficiencyOf`) from game logs. HOT / COLD ranks the leaders of points, rebounds and assists (`poolOf`) by `formOf` (`lib/league/form.ts`): impact per game over the last five games (three while fewer than ten are played) against the games before, cameos under 8 minutes ignored. Both tabs fetch those players' game logs (the same cached queries the player page uses). The leaders query key carries a shape version (`['leaders', 2]`): bump it when categories change so an older persisted copy is not reused.
Clutch (`lib/game/clutch.ts`, `ClutchCard` on the Summary tab, whole game only): shots and free throws in the last five minutes of the 4th or overtime with the margin at five or less before the shot, from the play-by-play; hidden until a game has any.
Lock Screen widget (`lock-screen-widget.tsx`, accessory circular/rectangular/inline: record, streak, last five, next game) and Watchlist widget (`watchlist-widget.tsx`, medium/large: starred games' scores and starred players' latest lines; `useWatchlistWidgetSync` pushes it, builders `buildLockProps` / `buildWatchlistProps` in `snapshots.ts`, tested). Both are in `app.json` and need `expo prebuild` + a native rebuild; not yet verified on a device. In the Live Activity a score of 100+ shrinks to fit (`minimumScaleFactor`) instead of being cut to "1…".

## Loading, transitions and gestures
- Performance rules (keep them): the drawer keeps every opened screen mounted, so (1) the team state is a small external store (`state/team-store.tsx`), read with selectors (`useTeamStore((s) => s.currentTeamId)`) so changing team re-renders only what reads it, not every mounted screen; (2) `TeamHome` builds everything under the card in a deferred pass when the team changes; (3) the team switcher lights the tapped tile at once and closes before the team changes. Do not freeze drawer scenes or defer a scene's whole content (`react-freeze`, `useDeferredValue` in the drawer layout): it left a blank generic background between screens and while swiping back. Entrance animations are kept only where they carry meaning (tab and mode slides, the team card's deal-in, the pregame header); staggered fade-ins on lists and cards were removed. Don't add per-item `entering` back.
- Navigation that pushes or pops goes through `src/navigation/nav.ts` (`openDetail`, `pushOnce`, `goBack`), which share a 700 ms lock: a second tap before the screen has finished sliding is ignored, so a double tap on a game card cannot push the page twice (and a double tap on a back arrow cannot pop two). Use `pushOnce` instead of `router.push` for anything new that opens a page. Back arrows call `goBack()` from `@/navigation`, never `router.back()` directly: a game opened straight from a widget, the Dynamic Island or a link has nothing under it, and `router.back()` would do nothing; `goBack` falls back to the home card.
- Long stacks: game, team and player pages push onto each other, and `openDetail` swaps the top page instead of pushing once `MAX_DETAIL_DEPTH` (3) are stacked. There is deliberately no "back to menu" shortcut button (it crowded the headers). `NavDepthTracker` reads the root stack one level down (the navigation state wraps it in `__root`).
- The game page's team logos are drawn once, by `GameLogos`, above the scrolling page (not inside `ScoreHero`): they start on measured slots in the big header and, driven by `scrollY`, ride up and glide into the top bar without ever hiding. `ScoreHero` keeps empty slots and reports their position (`onLogoSlot`); `GameTopBar` only leaves room for them. The top bar also shows the start time (`kickoffLabel` in `lib/date.ts`, device time) as a pill under the matchup, and under "Scheduled" before tip-off.
- Live game header: under each team's name, seven bars show the timeouts left (green = left; ESPN's `timeoutsRemaining`, live games only), fading out as the page scrolls so they never ride under the top bar. While a timeout is on (`timeoutInProgress` in `lib/game/timeouts.ts`: the newest play of a live game is a timeout; ESPN has no flag for it) a "NOP TO" pill sits under the clock ("Official TO" for a TV timeout) and the compact bar does not repeat it. There is no "updated ago" text.
- Loading states are skeletons, not spinners: `Skeleton` / `SkeletonGroup` (one shared pulse) and `ListSkeleton` in `src/components`, plus screen-shaped ones next to their feature (`PlayerSkeleton`, `GameSkeleton`). Query `isPending` decides; never show an empty state while data is still loading.
- Shared-element transitions use Reanimated's `sharedTransitionTag` (static flag `ENABLE_SHARED_ELEMENT_TRANSITIONS` in `package.json`, native rebuild needed). The list adds `o=<origin>` to the link and tags with `sharedTag(origin, ...)` from `@/navigation`; the destination reads `o`. Currently: Standings logo to team page, Scores strip logos and scores to the game.
- The team page's pull-to-refresh is the card itself playing, not a spinner: pull past the threshold and let go (`useManualRefresh`, triggered from the scroll handler's `onEndDrag`; no native control, so no empty gap). `useRefreshAnimation` gives the card a clock that the finger scrubs and that loops while refreshing (and finishes its loop to settle); the card's logo plays the team's own motion from `TeamRefresh/motions.ts` (waves per axis, keyed by ESPN abbreviation: the Hawks soar, the Rockets launch...), a band of light sweeps across, and the card punches at the threshold. A team without an entry gets a gentle bounce. Calendar Day view: one scoreboard row per game (`GameCard`: away side, score and clock in the middle, home side; each side leans on its team's color via `matchupColors`, records from the scoreboard feed, logos are the dark-background variants, the margin shows while live), ordered selected team's game, then live games, then the rest; `GameCardSkeleton` has the same measurements. The day view is a pager like the rosters (`DayPager`: a compact strip of day pills above one page per day, `DayPage`, `windowSize` 3, so the visible day and its neighbours are mounted; a move of more than two days jumps with a fade; the strip is `DayPills`, driven by the pager's fractional position (`page`) like the rosters' `TeamPills`; both use `useStripFollow` (`src/hooks`): the strip is shifted by a transform computed from `page` in the same frame, never scrolled from a reaction (that landed a frame late and made the frame speed up and slow down); the real scroll offset only changes when you scroll the strip yourself, and a tap eases it over the pager's whole trip; worklets there must not call JS helpers such as `withAlpha`, and its animated style must read every shared value in its own body (values hidden inside a helper function did not trigger updates: the strip stood still), a title row above the strip names the month and year of the selected day and how far it is from today ("December 2026 · In 43 days"), the strip follows the page and the pager follows the strip and the Today button; a month pick outside the usual range widens the day list through `extra`; like the rosters, only the day the pager rests on and its neighbours read games and build cards (`settledAt`, 120 ms after it stops), every page being scrolled past shows still empty cards, and once at rest the days one and two away are prefetched; the day pills have no per-pill worklets). `GameCard`, `DayPage`, `DayPager` and `constants.ts` live under `features/calendar`. Month cells grow to the free height of the screen, and a swipe moves to the next or previous month. On Month and Agenda a game still to come is dressed in the opponent's color with its dark-background logo (`opponentLook` in `utils/`), and the day pills show a dot under the days your team plays, a game played in the result's color (green win, red loss; on the Month a solid W/L chip). Swipe sideways on the games for the next or previous day; the strip covers 30 days back and 35 ahead.
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
