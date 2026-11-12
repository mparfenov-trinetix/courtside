import { View } from 'react-native';

import { HeadToHead, type H2HTeam } from '@/components';
import type { GameInfo, GameKind, Pregame as PregameData } from '@/lib/espn';
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
  away,
  home,
  data,
  info,
  date,
  kind,
  season,
  note,
}: {
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
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <PregameOdds away={away} home={home} pregame={data} />
      </View>
      {/* The best player of each side, face to face: the hook of the game, so right after who is favored. Lays itself out with its own padding. */}
      <View style={{ marginTop: 18 }}>
        <KeyMatchup awayId={away.id} homeId={home.id} injuries={info.injuries} />
      </View>
      {/* These two lay themselves out with their own side padding. */}
      <View>
        <InjuryReport injuries={info.injuries} teams={teams} />
        <GameInfoCard info={info} />
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <MatchupForm away={away} home={home} form={data.form} />
        <HeadToHead a={away} b={home} delay={140} />
        <MatchupPlace kind={kind} season={season} note={note} away={away} home={home} date={date} variant="card" />
      </View>
    </View>
  );
}
