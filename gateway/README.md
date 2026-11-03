# Courtside gateway

A small Cloudflare Worker that sits between the app and ESPN's undocumented NBA endpoints.

**Why bother:** one request to ESPN serves every device (cached for seconds while a game is live, a day once it's
final), the web preview stops hitting CORS, ESPN errors fall back to the last good answer, and when ESPN moves
something there is one place to change. The app works without it; it is purely a layer on top.

## Run it

```bash
cd gateway
npm install
npm test          # route table + cache lifetimes, no network
npm run dev       # local worker on http://localhost:8787
npm run deploy    # needs a free Cloudflare account (`npx wrangler login` once)
```

## Point the app at it

Set one env var for the Expo app (it is read at build/start time):

```bash
EXPO_PUBLIC_ESPN_PROXY=https://courtside-gateway.<subdomain>.workers.dev/espn npx expo start
```

Unset, the app talks to ESPN directly, exactly as before.

## Routes

`GET /espn/<source>/<path>?<query>` where `<source>` is one of `site`, `web2`, `web3`, `core`, `search`
(see `src/routes.ts`). Only the paths the app uses are allowed; everything else is a 404. `GET /health` for checks.

Responses carry `x-cache: HIT|MISS`.

## Ideas for later

- **Push notifications** (game start, final, close games): a cron trigger polls `scoreboard`, diffs against the last
  snapshot in KV, and sends through Expo's push API to registered device tokens.
- **Normalized endpoints** (`/v1/game/:id`) so the parsing in `src/lib/espn.ts` can move server-side.
