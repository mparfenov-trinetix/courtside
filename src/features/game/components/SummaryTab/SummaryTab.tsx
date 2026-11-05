import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Collapsible, HeadToHead } from "@/components";
import { ClutchCard } from "../ClutchCard";
import { GameFlow } from "../GameFlow";
import { GameInfoCard, GameLeaders, InjuryReport } from "../GameLeaders";
import { KeyMoments } from "../KeyMoments";
import { StandingsLink } from "../MatchupStandings";
import { Pregame } from "../Pregame";
import { TeamStatsCard } from "../TeamStatsCard";
import { Timeouts } from "../Timeouts";
import type {
  BoxScorePlayer,
  BoxScoreTeam,
  GameInfo,
  Play,
  Pregame as PregameData,
} from "@/lib/espn";
import {
  buildFourFactors,
  buildKeyStats,
  buildMoreStats,
  type Flow,
  type TeamNums,
} from "@/lib/game";

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
  pregame: PregameData;
  live: boolean;
  hasStarted: boolean;
  selPeriods: number[] | null;
  periodNote?: string;
}) {
  const injuryCount = info.injuries.length;
  // The two sides as the pregame cards want them: logo that reads on the dark page, and the matchup colors.
  const awaySide = {
    id: away.team.id,
    abbr: away.team.abbreviation,
    logo: away.team.logoDark || away.team.logo,
    color: awayColor,
  };
  const homeSide = {
    id: home.team.id,
    abbr: home.team.abbreviation,
    logo: home.team.logoDark || home.team.logo,
    color: homeColor,
  };

  const leaders = hasStarted && (
    <Animated.View key="leaders">
      <GameLeaders
        away={{
          teamId: away.team.id,
          abbr: away.team.abbreviation,
          color: awayColor,
          players: awayPlayers,
        }}
        home={{
          teamId: home.team.id,
          abbr: home.team.abbreviation,
          color: homeColor,
          players: homePlayers,
        }}
      />
    </Animated.View>
  );

  const flowChart = plays.length > 1 && (
    <Animated.View key="flow">
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
    <Animated.View key="timeouts">
      <Timeouts
        away={away}
        home={home}
        plays={plays}
        live={live}
        awayColor={awayColor}
        homeColor={homeColor}
      />
    </Animated.View>
  );

  const moments = plays.length > 1 && (
    <Animated.View key="moments">
      <KeyMoments
        flow={flow}
        away={away}
        home={home}
        awayColor={awayColor}
        homeColor={homeColor}
      />
    </Animated.View>
  );

  const stats = hasStarted && awayNums && homeNums && (
    <Animated.View key="stats">
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

  // Only for the whole game: a quarter or half filter would cut the clutch window out of the story.
  const clutch = hasStarted && !selPeriods && (
    <Animated.View key="clutch">
      <ClutchCard
        plays={plays}
        away={{ teamId: away.team.id, abbr: away.team.abbreviation, color: awayColor, players: awayPlayers }}
        home={{ teamId: home.team.id, abbr: home.team.abbreviation, color: homeColor, players: homePlayers }}
      />
    </Animated.View>
  );

  // Live: the swing first, then the numbers and who's producing. Final: who stood out, how the teams
  // compared, then the story of the game.
  const ordered = live
    ? [flowChart, stats, leaders, clutch, timeouts, moments]
    : [leaders, clutch, stats, flowChart, moments, timeouts];

  return (
    <View>
      {ordered}
      {!hasStarted && (
        <Pregame
          away={awaySide}
          home={homeSide}
          data={pregame}
          info={info}
          date={info.date}
        />
      )}
      {hasStarted && (
        <StandingsLink away={awaySide} home={homeSide} date={info.date} />
      )}

      {/* Their meetings stay useful while the game is on; once it is over the result is the story. */}
      {live && (
        <View style={{ paddingHorizontal: 16 }}>
          <HeadToHead a={awaySide} b={homeSide} />
        </View>
      )}

      {hasStarted && (
        <View style={{ marginTop: 14 }}>
          <Collapsible
            title={live ? "Injuries and game info" : "Game info"}
            hint={
              live && injuryCount > 0
                ? `${injuryCount} injur${injuryCount === 1 ? "y" : "ies"}`
                : undefined
            }
            defaultOpen={false}
          >
            {/* ESPN's injury report is today's, never the one from the day of the game: shown only while the game can
            still be affected by it, never on a finished game. */}
            {live && (
              <InjuryReport
                injuries={info.injuries}
                nested
                teams={[
                  {
                    id: away.team.id,
                    abbr: away.team.abbreviation,
                    color: awayColor,
                  },
                  {
                    id: home.team.id,
                    abbr: home.team.abbreviation,
                    color: homeColor,
                  },
                ]}
              />
            )}
            {/* Finished: the section is already called "Game info", so the card has no second title; live, it sits under the injury report and keeps its own. */}
            <GameInfoCard info={info} nested titled={live} />
          </Collapsible>
        </View>
      )}
    </View>
  );
}
