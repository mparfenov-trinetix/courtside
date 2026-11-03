import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Collapsible } from '@/components/collapsible';
import { GameFlow } from '@/components/game/game-flow';
import { GameInfoCard, GameLeaders, InjuryReport } from '@/components/game/game-leaders';
import { KeyMoments } from '@/components/game/key-moments';
import { TeamStatsCard } from '@/components/game/team-stats-card';
import { Timeouts } from '@/components/game/timeouts';
import type { BoxScorePlayer, BoxScoreTeam, GameInfo, Play } from '@/lib/espn';
import {
  buildFourFactors,
  buildKeyStats,
  buildMoreStats,
  type Flow,
  type TeamNums,
} from '@/lib/game-model';

/**
 * The glanceable page. Order follows what you came for: while a game is on, the swing and the
 * timeouts first; once it's over, who stood out and how it was decided. Injuries and game
 * info sit behind a fold.
 */
export function SummaryTab({
  away,
  home,
  awayColor,
  homeColor,
  awayPlayers,
  homePlayers,
  awayNums,
  homeNums,
  plays,
  winProb,
  flow,
  info,
  live,
  hasStarted,
  selPeriods,
  periodNote,
}: {
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  awayColor: string;
  homeColor: string;
  awayPlayers: BoxScorePlayer[];
  homePlayers: BoxScorePlayer[];
  awayNums: TeamNums | null;
  homeNums: TeamNums | null;
  plays: Play[];
  winProb: Record<string, number>;
  flow: Flow;
  info: GameInfo;
  live: boolean;
  hasStarted: boolean;
  selPeriods: number[] | null;
  periodNote?: string;
}) {
  const injuryCount = info.injuries.length;

  const leaders = hasStarted && (
    <Animated.View key="leaders" entering={FadeInDown.delay(60).duration(280)}>
      <GameLeaders
        away={{ teamId: away.team.id, abbr: away.team.abbreviation, color: awayColor, players: awayPlayers }}
        home={{ teamId: home.team.id, abbr: home.team.abbreviation, color: homeColor, players: homePlayers }}
      />
    </Animated.View>
  );

  const flowChart = plays.length > 1 && (
    <Animated.View key="flow" entering={FadeInDown.delay(60).duration(280)}>
      <GameFlow
        plays={plays}
        winProb={winProb}
        flow={flow}
        home={home}
        away={away}
        homeColor={homeColor}
        awayColor={awayColor}
        selected={selPeriods}
        live={live}
      />
    </Animated.View>
  );

  const timeouts = hasStarted && (
    <Animated.View key="timeouts" entering={FadeInDown.delay(80).duration(280)}>
      <Timeouts away={away} home={home} plays={plays} live={live} awayColor={awayColor} homeColor={homeColor} />
    </Animated.View>
  );

  const moments = plays.length > 1 && (
    <Animated.View key="moments" entering={FadeInDown.delay(100).duration(280)}>
      <KeyMoments flow={flow} away={away} home={home} awayColor={awayColor} homeColor={homeColor} />
    </Animated.View>
  );

  const stats = hasStarted && awayNums && homeNums && (
    <Animated.View key="stats" entering={FadeInDown.delay(120).duration(280)}>
      <TeamStatsCard
        awayAbbr={away.team.abbreviation}
        homeAbbr={home.team.abbreviation}
        awayColor={awayColor}
        homeColor={homeColor}
        primary={buildKeyStats(awayNums, homeNums)}
        more={buildMoreStats(awayNums, homeNums)}
        factors={buildFourFactors(awayNums, homeNums)}
        note={periodNote}
      />
    </Animated.View>
  );

  // Live: the swing first, then the numbers and who's producing. Final: who stood out, how the teams
  // compared, then the story of the game.
  const ordered = live
    ? [flowChart, stats, leaders, timeouts, moments]
    : [leaders, stats, flowChart, moments, timeouts];

  return (
    <View>
      {ordered}

      <Collapsible
        title="Injuries and game info"
        hint={injuryCount > 0 ? `${injuryCount} injur${injuryCount === 1 ? 'y' : 'ies'}` : undefined}
        defaultOpen={!hasStarted}>
        <InjuryReport
          injuries={info.injuries}
          teams={[
            { id: away.team.id, abbr: away.team.abbreviation, color: awayColor },
            { id: home.team.id, abbr: home.team.abbreviation, color: homeColor },
          ]}
        />
        <GameInfoCard info={info} />
      </Collapsible>
    </View>
  );
}
