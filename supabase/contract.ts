// The contract between the app and the Supabase backend: what the app calls and the shapes that come back. Types only (no runtime code), so
// the app can copy or import them without pulling in anything. The backend is described in README.md; the SQL is in migrations/.
//
//   const supabase = createClient(URL, ANON_KEY, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true } });
//
//   1. First launch:       await supabase.auth.signInAnonymously()                 -> a session whose user id is the player's identity
//   2. Join:               await supabase.functions.invoke('join', { body: { username, code } })        (JoinRequest -> JoinResponse)
//   3. Games to pick on:   await supabase.from('games').select('*').gt('tip_off', now).order('tip_off')   (GameRow[])
//   4. Make a pick:        await supabase.from('picks').upsert({ user_id, game_id, team_id, favorite_id })  (PickInsert), onConflict 'user_id,game_id'
//   5. Take it back:       await supabase.from('picks').delete().match({ user_id, game_id })
//   6. My picks + results: await supabase.from('picks').select('*').eq('user_id', userId)                  (PickRow[])
//   7. The table:          await supabase.rpc('leaderboard')                                                (LeaderboardRow[])
//   8. Who picked what:    await supabase.from('game_picks').select('*').eq('game_id', id)                 (GamePickRow[]; others' picks only after tip-off)
//   9. Delete my account:  await supabase.functions.invoke('delete-account')
//  10. Phase 2 config:     await supabase.from('config').select('key, value')                              (ConfigRow[]; readable before signing in)

export type PickResult = 'pending' | 'win' | 'loss' | 'void';
export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled';
export type GameKind = 'regular' | 'preseason' | 'allstar' | 'playoffs' | 'playin' | 'cup-group' | 'cup-knockout';

/** A row of `profiles`. The server creates it (the `join` function); a phone only reads. */
export type ProfileRow = {
  id: string;
  username: string;
  created_at: string;
};

/** A row of `games`: the server's copy of ESPN's schedule. Read-only for the app. `id` is ESPN's event id, the same id the app uses everywhere. */
export type GameRow = {
  id: string;
  tip_off: string;
  away_id: string;
  away_abbr: string;
  home_id: string;
  home_abbr: string;
  status: GameStatus;
  status_detail: string | null;
  away_score: number | null;
  home_score: number | null;
  winner_team_id: string | null;
  kind: GameKind;
  settled_at: string | null;
  updated_at: string;
};

/** What a phone sends to make or change a pick. Nothing else is accepted: `made_at` and `result` are the server's, and are ignored if sent. */
export type PickInsert = {
  user_id: string;
  game_id: string;
  /** The team picked to win: the game's `away_id` or `home_id`. */
  team_id: string;
  /** Who was favored when the pick was made (the app's `favoriteOf`), or null/omitted when nobody was. */
  favorite_id?: string | null;
};

/** A row of `picks`. */
export type PickRow = {
  user_id: string;
  game_id: string;
  team_id: string;
  favorite_id: string | null;
  /** Stamped by the server on every write. */
  made_at: string;
  updated_at: string;
  result: PickResult;
};

/** A row of the `game_picks` view. */
export type GamePickRow = {
  game_id: string;
  user_id: string;
  username: string;
  team_id: string;
  result: PickResult;
  made_at: string;
};

/** A row of `rpc('leaderboard')`, best first. Mirrors the app's PickSummary (src/lib/league/pickem.ts); the formulas are in the migration. */
export type LeaderboardRow = {
  /** 1-based; players equal on wins and accuracy share a rank (1, 2, 2, 4). */
  rank: number;
  user_id: string;
  username: string;
  wins: number;
  losses: number;
  /** Picks still waiting for a result. */
  pending: number;
  /** wins / (wins + losses), 0..1; null before the first result. */
  accuracy: number | null;
  /** The run you are on; null before the first result. */
  streak_kind: 'W' | 'L' | null;
  streak_length: number | null;
  best_streak: number;
  /** Over settled picks that had a favorite: how many, how many you got right, how many the favorite won. */
  versus_games: number;
  versus_you: number;
  versus_favorite: number;
  /** Right calls on an underdog. */
  upsets: number;
};

export type ConfigRow = { key: string; value: unknown; updated_at: string };

// -- join ----------------------------------------------------------------------------------------------------------------------------

export type JoinRequest = { username: string; code: string };
export type JoinResponse = { profile: ProfileRow; created: boolean };

// -- errors --------------------------------------------------------------------------------------------------------------------------

/** What the functions answer with on a failure: `{ error: { code, message } }`, with these codes and HTTP statuses. */
export type FunctionErrorCode =
  | 'invalid_username' // 400
  | 'bad_request' // 400
  | 'unauthorized' // 401
  | 'wrong_code' // 403
  | 'username_taken' // 409
  | 'rate_limited' // 429
  | 'server_error'; // 500

export type FunctionError = { error: { code: FunctionErrorCode; message: string } };

/** What a failed write to `picks` says (the Postgres message, in `error.message`): branch on these. */
export type PickErrorMessage =
  | 'game_not_found' // the game is not in `games` (the settle function reads only a few days ahead)
  | 'pick_locked' // started, over, postponed, canceled, or not a kind that can be picked
  | 'invalid_team' // team_id is not one of the game's two
  | 'invalid_favorite'; // favorite_id is not one of the game's two
