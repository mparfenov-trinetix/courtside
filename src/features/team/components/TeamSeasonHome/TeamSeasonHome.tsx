import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ListSkeleton, Pill, ScreenHeader, SeasonButton, SeasonSheet, SectionLabel, TeamMark, TITLE_INSET, Glide, headerHeight } from '@/components';
import { useSeasonGames, useStandings, useTeam, useTilt } from '@/hooks';
import { currentSeason, teamAsItWas, type Game, type TeamDetail } from '@/lib/espn';
import { conferenceStanding, PLAYOFFS_FROM, playoffTag, seasonResult } from '@/lib/league';
import { fonts, fontSize, palette, space, surfaces, teamTheme, withAlpha } from '@/lib/theme';
import { goBack, openDetail } from '@/navigation';
import { SeasonResultCard } from '../SeasonResultCard';
import { cardHeight, TeamCard } from '../TeamCard';
import { TeamStarCard } from '../TeamStarCard';

/** "37-45": wins and losses of a list of finished games. */
function recordOf(games: Game[]): string {
  const wins = games.filter((g) => g.result === 'W').length;
  return `${wins}-${games.filter((g) => g.result === 'L').length}`;
}

/**
 * A team's card in a past season: the same trading card as the team page, in the name, logo and colors of that season (the SuperSonics
 * for 2006-07 where there is a card of its own for a name the team no longer has, today's logo and colors for any other), with that
 * season's record and place, how the season ended (a card for the playoffs: missed, the play-in, a round, the Finals or the title), the season's
 * best player, its home and away, and every game it played. The header is the team page's: empty over the card, the team's name once it has scrolled away. The season button switches to any other year without
 * leaving the page, so a team can be walked back through the years; the current season is the team page itself. Opened from the team
 * page's "Past seasons", a game, the standings or the champion card of an old season.
 */
export function TeamSeasonHome({ teamId, season: initial }: { teamId: string; season: number }) {
  const [season, setSeason] = useState(initial);
  const [picking, setPicking] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const current = useTeam(teamId);
  const team = current ? teamAsItWas(current, season) : null;
  const theme = teamTheme(team);
  const { data: standings, isPending: standingsPending } = useStandings(season);
  const { data: games, isPending: gamesPending } = useSeasonGames(teamId, season);

  const cardWidth = Math.round(Math.min(width * 0.78, 360, (height - insets.top - insets.bottom - 230) / 1.4));
  const tilt = useTilt({ width: cardWidth, height: cardHeight(cardWidth) }, { scrollSafe: true });

  // The title comes in once the card is mostly gone and goes out only when you are back almost at the top (as on the team page).
  const titleShown = useSharedValue(0);
  const cardH = cardHeight(cardWidth);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (e.contentOffset.y > cardH * 0.7) titleShown.set(1);
      else if (e.contentOffset.y < cardH * 0.1) titleShown.set(0);
    },
  });
  const titleProgress = useDerivedValue(() => withTiming(titleShown.get(), { duration: 260, easing: Easing.out(Easing.cubic) }));
  const headerFill = useAnimatedStyle(() => ({ opacity: titleProgress.get() }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleProgress.get(), transform: [{ translateY: (1 - titleProgress.get()) * 8 }] }));
  // A new season starts at the top, with the title away.
  useEffect(() => {
    titleShown.set(0);
  }, [season, titleShown]);
  const bg = useSharedValue<string>(theme.background);
  useEffect(() => {
    bg.set(withTiming(theme.background, { duration: 500 }));
  }, [theme.background, bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.get() }));

  const entry = [...(standings?.east ?? []), ...(standings?.west ?? [])].find((e) => e.teamId === teamId);
  const standing = conferenceStanding(standings, teamId);
  const finished = useMemo(() => (games ?? []).filter((g) => g.completed).sort((a, b) => b.date.localeCompare(a.date)), [games]);
  // The regular season is the first games the standings count (the playoffs follow it, and before 2003-04 ESPN gives them no note to tell them by).
  const regular = useMemo(() => {
    if (!entry) return [];
    return finished.slice().reverse().slice(0, entry.wins + entry.losses);
  }, [finished, entry]);

  if (!team) return <View style={{ flex: 1, backgroundColor: palette.arena }} />;

  // How the season ended: not before 2002-03 (ESPN's schedules have gaps there), and only once both the games and the record are in.
  const result = season >= PLAYOFFS_FROM && games && entry ? seasonResult(games, entry.wins + entry.losses, season) : null;

  const detail: TeamDetail = { ...team, record: entry ? `${entry.wins}-${entry.losses}` : undefined };
  const home = recordOf(regular.filter((g) => g.home));
  const away = recordOf(regular.filter((g) => !g.home));

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      {/* Over the page, see-through while the card is on screen (it tilts), filling in with the page color once you scroll. */}
      <View style={[styles.headerWrap, { height: headerHeight(insets.top) }]} pointerEvents="box-none">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bgStyle, headerFill]} />
        <ScreenHeader
          onBack={goBack}
          centerTitle
          title={
            <Animated.View style={[styles.headerTitle, titleStyle]} pointerEvents="none">
              <TeamMark team={team} maxWidth={width - 2 * TITLE_INSET} />
            </Animated.View>
          }
          right={<SeasonButton season={season} onPress={() => setPicking(true)} />}
        />
      </View>
      <Animated.ScrollView
        key={season}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerHeight(insets.top), paddingBottom: insets.bottom + 32 }}>
        <View style={styles.cardArea}>
          <TeamCard key={season} team={team} detail={detail} standing={standing} loading={standingsPending && !entry} width={cardWidth} tilt={tilt} />
        </View>

        <View style={styles.splits}>
          <Split label="Home" value={gamesPending || !entry ? undefined : home} />
          <Split label="Away" value={gamesPending || !entry ? undefined : away} />
          <Split label="Win %" value={entry ? entry.winPct.toFixed(3).replace(/^0/, '') : undefined} />
        </View>

        {/* How the season ended, and who carried it. */}
        {/* Both arrive when their data does (the result needs the games and the record, the player his own request), fading in while what is under them glides down. */}
        <Glide>{result ? <SeasonResultCard result={result} theme={theme} place={standing ? `Finished ${standing.toLowerCase()}` : undefined} /> : null}</Glide>
        <Glide>
          <TeamStarCard teamId={teamId} theme={theme} season={season} />
        </Glide>

        {/* The page of the team as it is today. */}
        {current ? (
          <Glide>
          <Pressable
            onPress={() => openDetail(`/team/${teamId}` as never)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${current.displayName}`}
            style={({ pressed }) => [styles.today, pressed && { opacity: 0.8 }]}>
            <Image source={current.logoDark || current.logo} style={styles.todayLogo} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.todayLabel}>Today</Text>
              <Text style={styles.todayName} numberOfLines={1}>{current.displayName}</Text>
            </View>
            <Text style={[styles.todayGo, { color: theme.accent }]}>›</Text>
          </Pressable>
          </Glide>
        ) : null}

        <Glide style={styles.list}>
          <SectionLabel>Season results</SectionLabel>
          {gamesPending ? (
            <ListSkeleton count={6} avatar="round" />
          ) : finished.length === 0 ? (
            <Text style={styles.empty}>ESPN has no games for this season.</Text>
          ) : (
            <Card padded={false}>
              {finished.map((g, i) => (
                <Result key={g.id} game={g} first={i === 0} />
              ))}
            </Card>
          )}
        </Glide>
      </Animated.ScrollView>
      <SeasonSheet
        visible={picking}
        season={season}
        onPick={(year) => (year >= currentSeason() ? openDetail(`/team/${teamId}` as never) : setSeason(year))}
        onClose={() => setPicking(false)}
        title={`${team.name}, by season`}
      />
    </Animated.View>
  );
}

function Split({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.split}>
      <Text style={styles.splitLabel}>{label}</Text>
      <Text style={styles.splitValue}>{value ?? '–'}</Text>
    </View>
  );
}

/** One game of the season: when, against whom (that opponent's name and logo of the time), the result and the score. A tap opens the game. */
function Result({ game, first }: { game: Game; first: boolean }) {
  const date = new Date(game.date.replace(/T(\d\d:\d\d)Z$/, 'T$1:00Z')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const tag = playoffTag(game.note);
  const win = game.result === 'W';
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${game.result === 'W' ? 'Won' : 'Lost'} ${game.home ? 'vs' : 'at'} ${game.opponentAbbr}, ${game.teamScore} to ${game.opponentScore}`}
      style={({ pressed }) => [styles.row, !first && styles.border, pressed && { backgroundColor: surfaces.raised }]}>
      <Text style={styles.date}>{date}</Text>
      {game.opponentLogo ? <Image source={game.opponentLogo} style={styles.opLogo} contentFit="contain" /> : <View style={styles.opLogo} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.opponent} numberOfLines={1}>
          {game.home ? 'vs' : '@'} {game.opponentAbbr}
        </Text>
      </View>
      {tag ? <Pill>{tag}</Pill> : null}
      <Text style={[styles.score, { color: win ? palette.win : palette.loss }]}>
        {game.result} {game.teamScore}–{game.opponentScore}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  cardArea: { alignItems: 'center', paddingTop: space.sm },
  splits: { flexDirection: 'row', paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.xl },
  split: { gap: space.xxs },
  splitLabel: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted },
  splitValue: { fontFamily: fonts.display, fontSize: fontSize.heading, color: palette.chalk },
  today: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.xl, padding: space.md, borderRadius: 16, backgroundColor: surfaces.card },
  todayLogo: { width: 40, height: 40 },
  todayLabel: { fontFamily: fonts.bodySemi, fontSize: fontSize.caption, letterSpacing: 0.6, textTransform: 'uppercase', color: palette.muted },
  todayName: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  todayGo: { fontFamily: fonts.bodyBold, fontSize: 26 },
  list: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.sm },
  empty: { fontFamily: fonts.body, fontSize: fontSize.body, color: palette.muted, textAlign: 'center', paddingVertical: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.md },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  date: { width: 48, fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.muted },
  opLogo: { width: 28, height: 28 },
  opponent: { fontFamily: fonts.bodyBold, fontSize: fontSize.body, color: withAlpha(palette.chalk, 0.9) },
  score: { fontFamily: fonts.display, fontSize: fontSize.title, minWidth: 92, textAlign: 'right' },
});
