import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Collapsible, HeadToHead } from '@/components';
import { GameFlow } from '../GameFlow';
import { GameInfoCard, GameLeaders, InjuryReport } from '../GameLeaders';
import { KeyMoments } from '../KeyMoments';
import { MatchupForm } from '../MatchupForm';
import { PregameOdds } from '../PregameOdds';
import { TeamStatsCard } from '../TeamStatsCard';
import { Timeouts } from '../Timeouts';
import type { BoxScorePlayer, BoxScoreTeam, GameInfo, Play, Pregame } from '@/lib/espn';
import {
  buildFourFactors,
  buildKeyStats,
  buildMoreStats,
  type Flow,
  type TeamNums,
} from '@/lib/game';

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
  pregame,
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
  pregame: Pregame;
  live: boolean;
  hasStarted: boolean;
  selPeriods: number[] | null;
  periodNote?: string;
}) {
  const injuryCount = info.injuries.length;
  // The two sides as the pregame cards want them: logo that reads on the dark page, and the matchup colors.
  const awaySide = { id: away.team.id, abbr: away.team.abbreviation, logo: away.team.logoDark || away.team.logo, color: awayColor };
  const homeSide = { id: home.team.id, abbr: home.team.abbreviation, logo: home.team.logoDark || home.team.logo, color: homeColor };

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

  // Before tip-off there is nothing to replay, so the page is about the matchup instead.
  const preview = !hasStarted && (
    <View key="preview" style={{ paddingHorizontal: 16, marginBottom: 18 }}>
      <PregameOdds away={awaySide} home={homeSide} pregame={pregame} />
      <MatchupForm away={awaySide} home={homeSide} form={pregame.form} />
      <HeadToHead a={awaySide} b={homeSide} delay={120} />
    </View>
  );

  return (
    <View>
      {ordered}
      {preview}

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
