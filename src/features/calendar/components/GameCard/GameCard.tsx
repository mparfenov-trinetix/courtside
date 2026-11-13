import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FlashOverlay, PickBadge, Tick } from '@/components';
import { prefetchHeadToHead, usePlayoffSeeds } from '@/hooks';
import { CupBadge } from '@/features/cup';
import { PlayoffBadge } from '@/features/playoffs';
import { seasonOfDate, teamInSeason, type ScoreboardGame, type Team } from '@/lib/espn';
import { playoffTag } from '@/lib/league';
import { fonts, matchupColors, palette, withAlpha, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { usePick } from '@/state';

/** The margin between two scores; 0 while either is missing. (A plain function: the React Compiler can't take this as a ternary.) */
function leadOf(a?: number, b?: number): number {
  if (a == null || b == null) return 0;
  return Math.abs(a - b);
}

/** The team ahead (the home side when level). */
function leaderAbbr(away: ScoreboardGame['away'], home: ScoreboardGame['home']): string {
  if (away.score == null || home.score == null) return home.abbreviation;
  return away.score > home.score ? away.abbreviation : home.abbreviation;
}

/** One game as a scoreboard row: away side, the score and clock in the middle, home side, each side in its team's color. */
export function GameCard({
  game,
  mine,
  accent,
  abbr,
  teams,
  wrapSide,
}: {
  game: ScoreboardGame;
  mine: boolean;
  accent: string;
  abbr?: string;
  teams?: Team[];
  /** Wraps each team's side (logo, code, record), so a screen can make the two sides buttons (Pick'em: a tap on a side picks that team); a tap anywhere else still opens the game. */
  wrapSide?: (side: 'away' | 'home', node: ReactNode) => ReactNode;
}) {
  const { home, away, status, completed, inProgress } = game;
  const client = useQueryClient();
  const started = completed || inProgress;

  // Each side leans on its team's color, as on the game page: the card reads as the matchup before you read it.
  const awayTeam = teams?.find((t) => t.id === away.teamId);
  const homeTeam = teams?.find((t) => t.id === home.teamId);
  // The logos are the ones the teams wore that season: a 2005 game is the SuperSonics' and the New Jersey Nets', not today's two.
  const gameSeason = seasonOfDate(game.date);
  const awayThen = teamInSeason(awayTeam, gameSeason);
  const homeThen = teamInSeason(homeTeam, gameSeason);

  let colors = { away: palette.maple, home: palette.maple };
  if (awayTeam && homeTeam) colors = matchupColors(awayTeam, homeTeam);

  // Tip-off in the device's time (ESPN's own text is Eastern); a game that has started shows its clock, or Final.
  const when = new Date(game.date.replace(/T(\d\d:\d\d)Z$/, 'T$1:00Z'));
  const tip = Number.isNaN(when.getTime()) ? status : when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const line = completed ? 'Final' : inProgress ? status : tip;
  const lead = started ? leadOf(away.score, home.score) : 0;
  const showMine = mine && !!abbr;
  const postseason = game.kind === 'playoffs' || game.kind === 'playin';
  // A game you made a call on carries a small tag with it ("PICK NYK", then a tick or a cross).
  const pick = usePick(game.id);
  const hasTags = Boolean(game.cup) || (postseason && !!playoffTag(game.note)) || showMine || !!pick;
  // "(3)" beside a team in a playoff game: its seed.
  const seeds = usePlayoffSeeds(gameSeason, game.kind === 'playoffs');
  const showLead = inProgress && lead > 0;
  const leader = leaderAbbr(away, home);

  const awaySide = <TeamSide team={away} logo={awayThen?.logoDark || awayThen?.logo || away.logo} winner={away.winner} completed={completed} seed={seeds?.[away.teamId]} />;
  const homeSide = <TeamSide team={home} logo={homeThen?.logoDark || homeThen?.logo || home.logo} winner={home.winner} completed={completed} seed={seeds?.[home.teamId]} right />;

  return (
    <Pressable
      // The finger is down: the page about to open starts reading the two teams' history now, so it is ready when it shows.
      onPressIn={() => prefetchHeadToHead(client, away.teamId, home.teamId)}
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${away.abbreviation} at ${home.abbreviation}, ${line}`}
      style={({ pressed }) => [styles.card, mine && { borderColor: withAlpha(accent, 0.75) }, pressed && { opacity: 0.8 }]}>
      <LinearGradient
        colors={[withAlpha(colors.away, 0.34), withAlpha(colors.away, 0.04), withAlpha(colors.home, 0.04), withAlpha(colors.home, 0.34)]}
        locations={[0, 0.38, 0.62, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Only a game that is on can change under your eyes: the flash and the sliding numbers exist for those, and a finished or upcoming
          card is plain text (a page of fifteen cards used to carry thirty animated views for nothing). */}
      {inProgress ? <FlashOverlay radius={16} signature={`${away.score ?? ''}-${home.score ?? ''}-${status}`} /> : null}

      {wrapSide ? wrapSide('away', awaySide) : awaySide}

      <View style={styles.mid}>
        {hasTags ? (
          <View style={styles.tags}>
            {game.cup ? <CupBadge stage={game.cup} /> : null}
            {postseason ? <PlayoffBadge note={game.note} /> : null}
            <PickBadge pick={pick} />
            {showMine ? <Text style={[styles.mineTag, { color: accent }]}>★ {abbr}</Text> : null}
          </View>
        ) : null}
        {started ? (
          <View style={styles.scores}>
            <Score value={away.score} dim={completed && !away.winner} live={inProgress} />
            <Text style={styles.dash}>–</Text>
            <Score value={home.score} dim={completed && !home.winner} live={inProgress} />
          </View>
        ) : (
          <Text style={styles.tipTime}>{tip}</Text>
        )}
        <View style={styles.statusRow}>
          {inProgress ? <View style={styles.liveDot} /> : null}
          <Status live={inProgress} done={completed} text={started ? line : 'Tip-off'} />
        </View>
        {showLead ? (
          <Text style={styles.leadText}>
            {leader} +{Math.round(lead)}
          </Text>
        ) : null}
        {/* A playoff game's series: after this game once it is played ("NYK won 4-2"), as it stands for one still to come. */}
        {game.series ? <Text style={styles.series} numberOfLines={1}>{game.series}</Text> : null}
      </View>

      {wrapSide ? wrapSide('home', homeSide) : homeSide}
    </Pressable>
  );
}

function Score({ value, dim, live }: { value?: number; dim: boolean; live: boolean }) {
  if (value == null) return null;
  const style = [styles.score, dim && { color: withAlpha(palette.chalk, 0.58) }];
  return live ? <Tick style={style} value={Math.round(value)} /> : <Text style={style}>{Math.round(value)}</Text>;
}

/** The clock or "Final": animated only while the game is on. */
function Status({ live, done, text }: { live: boolean; done: boolean; text: string }) {
  const style = [styles.statusText, live && { color: palette.win }, done && { color: withAlpha(palette.chalk, 0.65) }];
  return live ? <Tick style={style} value={text} /> : <Text style={style}>{text}</Text>;
}

/** One team: logo, abbreviation and record; the home side is mirrored. */
function TeamSide({ team, logo: source, winner, completed, seed, right }: { team: ScoreboardGame['home']; logo: string; winner?: boolean; completed: boolean; seed?: number; right?: boolean }) {
  const loser = completed && !winner;
  // Never an empty hole: a team without a logo shows its abbreviation in a disc.
  const logo = source ? (
    <Image source={source} style={styles.teamLogo} contentFit="contain" />
  ) : (
    <View style={[styles.teamLogo, styles.logoFallback]}>
      <Text style={styles.logoFallbackText}>{(team.abbreviation || team.name).slice(0, 3)}</Text>
    </View>
  );
  return (
    <View style={[styles.side, right && styles.sideRight]}>
      {right ? null : logo}
      <View style={{ alignItems: right ? 'flex-end' : 'flex-start' }}>
        <Text style={[styles.teamName, loser && { color: withAlpha(palette.chalk, 0.55) }]} numberOfLines={1}>
          {team.abbreviation || team.name}
          {seed ? <Text style={styles.seed}> ({seed})</Text> : null}
        </Text>
        {team.record ? <Text style={styles.record}>{team.record}</Text> : null}
      </View>
      {right ? logo : null}
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: withAlpha(palette.chalk, 0.08),
    backgroundColor: surfaces.faint,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  sideRight: { justifyContent: 'flex-end' },
  teamLogo: { width: 40, height: 40 },
  logoFallback: { borderRadius: 20, backgroundColor: withAlpha(palette.chalk, 0.12), alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { fontFamily: fonts.bodyBold, fontSize: 11, color: palette.chalk },
  teamName: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  record: { fontFamily: fonts.body, fontSize: 11, color: withAlpha(palette.chalk, 0.7), marginTop: 1 },
  mid: { width: 112, alignItems: 'center', gap: 1 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 },
  mineTag: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.3 },
  scores: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  score: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, color: palette.chalk },
  dash: { fontFamily: fonts.bodySemi, fontSize: 14, color: withAlpha(palette.chalk, 0.4) },
  tipTime: { fontFamily: fonts.display, fontSize: 25, lineHeight: 28, color: palette.chalk },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.3, color: withAlpha(palette.chalk, 0.7) },
  seed: { fontFamily: fonts.bodySemi, fontSize: 12, color: withAlpha(palette.chalk, 0.7) },
  series: { fontFamily: fonts.bodySemi, fontSize: 10, color: withAlpha(palette.chalk, 0.7), marginTop: 1 },
  leadText: { fontFamily: fonts.bodySemi, fontSize: 10, color: withAlpha(palette.chalk, 0.65) },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.win },
});
