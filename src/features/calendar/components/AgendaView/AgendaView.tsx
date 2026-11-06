import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeasonButton } from '@/components';
import { useTeams } from '@/hooks';
import { CupBadge } from '@/features/cup';
import { PlayoffBadge } from '@/features/playoffs';
import { currentSeason, type Game } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { opponentLook, type OpponentLook } from '../../utils';
import { WIN, LOSS, DOW } from './constants';

type Row = { type: 'month'; label: string } | { type: 'game'; game: Game };

const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

function withMonths(games: Game[]): Row[] {
  const rows: Row[] = [];
  let last = '';
  for (const game of games) {
    const label = monthLabel(new Date(game.date));
    if (label !== last) {
      rows.push({ type: 'month', label });
      last = label;
    }
    rows.push({ type: 'game', game });
  }
  return rows;
}

/** The selected team's schedule as a list: what's next, and how the season has gone. */
export function AgendaView({
  games,
  teamAbbr,
  accent,
  season,
  onSeasonPress,
  refreshControl,
}: {
  games: Game[];
  teamAbbr: string;
  accent: string;
  /** With `onSeasonPress`, a season button sits beside the tabs. A finished season opens on its results. */
  season?: number;
  onSeasonPress?: () => void;
  refreshControl?: ReactElement;
}) {
  const insets = useSafeAreaInsets();
  const { data: teams } = useTeams();
  const [tab, setTab] = useState<'upcoming' | 'results'>(season != null && season < currentSeason() ? 'results' : 'upcoming');

  const sorted = [...games].filter((g) => g.date).sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((g) => !g.completed);
  const results = sorted.filter((g) => g.completed).reverse();
  const shown = tab === 'upcoming' ? upcoming : results;
  const wins = results.filter((g) => g.result === 'W').length;

  return (
    <FlatList
      key={tab}
      data={withMonths(shown)}
      refreshControl={refreshControl}
      keyExtractor={(row, i) => (row.type === 'month' ? `m-${row.label}-${i}` : row.game.id)}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.tabs}>
          <Tab label={`Upcoming · ${upcoming.length}`} active={tab === 'upcoming'} onPress={() => setTab('upcoming')} accent={accent} />
          <Tab
            label={`Results · ${wins}–${results.length - wins}`}
            active={tab === 'results'}
            onPress={() => setTab('results')}
            accent={accent}
          />
          {season != null && onSeasonPress ? (
            <View style={styles.season}>
              <SeasonButton season={season} onPress={onSeasonPress} />
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{tab === 'upcoming' ? `No upcoming ${teamAbbr} games.` : `${teamAbbr} haven't played yet.`}</Text>
      }
      renderItem={({ item, index }) =>
        item.type === 'month' ? (
          <Text style={styles.month}>{item.label}</Text>
        ) : (
          <Animated.View>
            <GameRow game={item.game} accent={accent} look={opponentLook(teams, item.game.opponentId, item.game.opponentLogo)} />
          </Animated.View>
        )
      }
    />
  );
}

function Tab({ label, active, onPress, accent }: { label: string; active: boolean; onPress: () => void; accent: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && { borderBottomColor: accent }]}>
      <Text style={[styles.tabLabel, { color: active ? palette.chalk : palette.muted }]}>{label}</Text>
    </Pressable>
  );
}

/** One game: in the opponent's colors before it is played, in the result's after, with a logo that reads on them. */
function GameRow({ game, accent, look }: { game: Game; accent: string; look: OpponentLook | null }) {
  const d = new Date(game.date);
  const resultColor = game.result === 'W' ? WIN : LOSS;
  const isToday = new Date().toDateString() === d.toDateString();
  // Played games are dressed in the result (green win, red loss); games to come in the opponent's colors.
  const played = game.completed && !!game.result;
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, isToday && { borderColor: withAlpha(accent, 0.6) }, pressed && { opacity: 0.7 }]}>
      {look ? (
        <LinearGradient
          colors={[withAlpha(played ? resultColor : look.color, 0.5), withAlpha(played ? resultColor : look.color, 0.1), withAlpha(played ? resultColor : look.color, 0.04)]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.date}>
        <Text style={styles.dow}>{DOW[d.getDay()]}</Text>
        <Text style={styles.dayNum}>{d.getDate()}</Text>
      </View>
      {look?.logo || game.opponentLogo ? (
        <Image source={look?.logo || game.opponentLogo} style={styles.logo} contentFit="contain" />
      ) : (
        <View style={styles.logo} />
      )}
      <View style={styles.mid}>
        <Text style={styles.opp} numberOfLines={1}>
          <Text style={styles.at}>{game.home ? 'vs ' : '@ '}</Text>
          {game.opponent}
        </Text>
        <View style={styles.subRow}>
          <Text style={styles.sub}>{isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          {game.cup ? <CupBadge stage={game.cup} /> : null}
          <PlayoffBadge note={game.note} />
        </View>
      </View>
      {game.completed && game.result ? (
        <View style={styles.result}>
          <Text style={[styles.resultTag, { color: resultColor, backgroundColor: withAlpha(resultColor, 0.14) }]}>{game.result}</Text>
          <Text style={styles.score}>
            {game.teamScore}–{game.opponentScore}
          </Text>
        </View>
      ) : (
        <Text style={styles.time}>{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  season: { flex: 1, alignItems: 'flex-end' },
  tab: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  month: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.muted,
    paddingTop: 16,
    paddingBottom: 8,
  },
  empty: { textAlign: 'center', fontFamily: fonts.body, fontSize: 15, color: palette.muted, paddingTop: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: withAlpha('#FFFFFF', 0.06),
    overflow: 'hidden',
  },
  date: { width: 38, alignItems: 'center' },
  dow: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.5, color: palette.muted },
  dayNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: palette.chalk },
  logo: { width: 34, height: 34 },
  mid: { flex: 1 },
  opp: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  at: { color: palette.muted, fontFamily: fonts.body },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  result: { alignItems: 'flex-end', gap: 2 },
  resultTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  score: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  time: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
});
