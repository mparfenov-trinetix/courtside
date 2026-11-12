import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Collapsible, HeadToHead, Highlights } from "@/components";
import { ClutchCard } from "../ClutchCard";
import { GameDuel } from "../GameDuel";
import { GameFlow } from "../GameFlow";
import { GameHighlights } from "../GameHighlights";
import { GameInfoCard, GameLeaders, InjuryReport } from "../GameLeaders";
import { KeyMoments } from "../KeyMoments";
import { MatchupPlace } from "../MatchupPlace";
import { Pregame } from "../Pregame";
import { TeamStatsCard } from "../TeamStatsCard";
import { Timeouts } from "../Timeouts";
import type {
  BoxScorePlayer,
  BoxScoreTeam,
  GameInfo,
  GameKind,
  GameVideo,
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
  videos,
  gameId,
  completed = false,
  kind,
  season,
  note,
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
  videos: GameVideo[];
  gameId: string;
  /** The game is over: its video is looked for on YouTube. */
  completed?: boolean;
  kind: GameKind;
  season?: number;
  note?: string;
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

  // A finished game that was a duel (two players matching each other, 30+ within 6 points, or 40+ all-round): the two cards face to face, under the
  // leaders. For the whole game only, like the highlights: a quarter cannot be a duel.
  const duel = completed && !selPeriods && (
    <Animated.View key="duel">
      <GameDuel away={away} home={home} awayPlayers={awayPlayers} homePlayers={homePlayers} />
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

  // The clips of the game: the full highlights first, then the single plays in the order they were cut.
  const clips = [...videos].sort((a, b) => Number(b.fullGame) - Number(a.fullGame));

  // A finished game's one highlights section: its video from YouTube played right here, with ESPN's clips under it. It sits where a
  // live game's clips do. The period filter (pinned in the bar above, as on every tab) cannot cut a video, so under a quarter or half
  // the section steps aside; "Full" brings it back.
  const media = completed && !selPeriods && (
    <Animated.View key="media">
      <GameHighlights gameId={gameId} away={away.team} home={home.team} awayScore={away.score} homeScore={home.score} date={info.date} completed={completed} clips={clips} />
    </Animated.View>
  );

  // While a game is on there is no video: the clips come after the numbers.
  const highlights = !completed && clips.length > 0 && (
    <Animated.View key="highlights">
      <Highlights videos={clips} section />
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

  // One order for every game, live or finished, so a section is always where you left it: the team numbers and the leaders first (the
  // period filter in the bar above applies to both), then the clips (the game's video once it is over), then the story of the game.
  const ordered = [stats, leaders, duel, completed ? media : highlights, flowChart, clutch, moments, timeouts];

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
          kind={kind}
          season={season}
          note={note}
        />
      )}
      {hasStarted && (
        <MatchupPlace kind={kind} season={season} note={note} away={awaySide} home={homeSide} date={info.date} variant="link" />
      )}

      {/* Their meetings stay useful while the game is on; once it is over the result is the story. */}
      {live && (
        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <HeadToHead a={awaySide} b={homeSide} flush />
        </View>
      )}

      {hasStarted && (
        <View>
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
