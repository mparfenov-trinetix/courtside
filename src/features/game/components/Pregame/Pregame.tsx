import { View } from 'react-native';

import { HeadToHead, type H2HTeam } from '@/components';
import type { GameInfo, Pregame as PregameData } from '@/lib/espn';
import { GameInfoCard, InjuryReport } from '../GameLeaders';
import { MatchupForm } from '../MatchupForm';
import { MatchupStandings } from '../MatchupStandings';
import { PregameOdds } from '../PregameOdds';

/**
 * Everything about a game that hasn't started, most decisive first: who's favored (win probability and the book's
 * prices), who is missing (injuries, with where and when it's played), how each team has been playing, how they've done
 * against each other, and last the full conference table, which is the longest and the least specific to this game.
 */
export function Pregame({ away, home, data, info, date }: { away: H2HTeam; home: H2HTeam; data: PregameData; info: GameInfo; date?: string }) {
  const teams = [away, home].map((t) => ({ id: t.id, abbr: t.abbr, color: t.color }));
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <PregameOdds away={away} home={home} pregame={data} />
      </View>
      {/* These two lay themselves out with their own side padding. */}
      <View style={{ marginTop: 18 }}>
        <InjuryReport injuries={info.injuries} teams={teams} />
        <GameInfoCard info={info} />
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <MatchupForm away={away} home={home} form={data.form} />
        <HeadToHead a={away} b={home} delay={140} />
        <MatchupStandings away={away} home={home} date={date} />
      </View>
    </View>
  );
}
