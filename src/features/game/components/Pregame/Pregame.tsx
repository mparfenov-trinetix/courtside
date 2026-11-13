import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { GLIDE, HeadToHead, type H2HTeam } from '@/components';
import { PickCard, PickSplit } from '@/features/pickem';
import type { GameInfo, GameKind, Pregame as PregameData } from '@/lib/espn';
import { favoriteOf, isPickableKind } from '@/lib/league';
import { GameInfoCard, InjuryReport } from '../GameLeaders';
import { KeyMatchup } from '../KeyMatchup';
import { MatchupForm } from '../MatchupForm';
import { MatchupPlace } from '../MatchupPlace';
import { PregameOdds } from '../PregameOdds';

/**
 * Everything about a game that hasn't started, most decisive first: who's favored (win probability and the book's
 * prices), who plays it out (the two players of one position that matter most, face to face), who is missing (injuries, with where and when it's played), how each team has been playing, how they've done
 * against each other, and last where the game sits (the conference table, the playoff bracket or the Cup, by kind of game; none for an All-Star game), which is the longest and the least specific to this game.
 */
export function Pregame({
  gameId,
  away,
  home,
  data,
  info,
  date,
  kind,
  season,
  note,
}: {
  gameId: string;
  away: H2HTeam;
  home: H2HTeam;
  data: PregameData;
  info: GameInfo;
  date?: string;
  kind: GameKind;
  season?: number;
  note?: string;
}) {
  const teams = [away, home].map((t) => ({ id: t.id, abbr: t.abbr, color: t.color }));
  // With a win probability, your call is made right on its two numbers; without one the pick card stands on its own.
  const canPick = !!date && isPickableKind(kind);
  const inline = canPick && !!data.winProb;
  const game = date ? { id: gameId, date, away: { id: away.id, abbr: away.abbr, logo: away.logo }, home: { id: home.id, abbr: home.abbr, logo: home.logo } } : undefined;
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <PregameOdds
          away={away}
          home={home}
          pregame={data}
          pickable={
            inline && game
              ? (pct) => <PickSplit game={game} colors={{ away: away.color, home: home.color }} favoriteId={favoriteOf(away.id, home.id, data)} pct={pct} />
              : undefined
          }
        />
      </View>
      {/* No win probability to hold the buttons: the pick card, right under what there is on who is favored. */}
      {!inline && (
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <PickCard gameId={gameId} date={date} away={away} home={home} kind={kind} pregame={data} completed={false} started={false} />
        </View>
      )}
      {/* The best player of each side, face to face: the hook of the game, so right after who is favored. Lays itself out with its own padding. */}
      <View style={{ marginTop: 18 }}>
        <KeyMatchup awayId={away.id} homeId={home.id} injuries={info.injuries} />
      </View>
      {/* These two lay themselves out with their own side padding. They (and what follows) glide down when the key matchup above turns up late. */}
      <Animated.View layout={GLIDE}>
        <InjuryReport injuries={info.injuries} teams={teams} />
        <GameInfoCard info={info} />
      </Animated.View>
      <Animated.View layout={GLIDE} style={{ paddingHorizontal: 16 }}>
        <MatchupForm away={away} home={home} form={data.form} />
        <HeadToHead a={away} b={home} />
        <MatchupPlace kind={kind} season={season} note={note} away={away} home={home} date={date} variant="card" />
      </Animated.View>
    </View>
  );
}
