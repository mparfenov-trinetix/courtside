import { Image } from 'expo-image';
import { useState, type ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CupBadge } from '@/components/cup/cup-badge';
import type { Game } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/lib/nav';

const WIN = '#34D399';
const LOSS = '#F87171';
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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
  refreshControl,
}: {
  games: Game[];
  teamAbbr: string;
  accent: string;
  refreshControl: ReactElement;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming');

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
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{tab === 'upcoming' ? `No upcoming ${teamAbbr} games.` : `${teamAbbr} haven't played yet.`}</Text>
      }
      renderItem={({ item, index }) =>
        item.type === 'month' ? (
          <Text style={styles.month}>{item.label}</Text>
        ) : (
          <Animated.View entering={index < 10 ? FadeInDown.delay(index * 25).duration(240) : undefined}>
            <GameRow game={item.game} accent={accent} />
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

function GameRow({ game, accent }: { game: Game; accent: string }) {
  const d = new Date(game.date);
  const resultColor = game.result === 'W' ? WIN : LOSS;
  const isToday = new Date().toDateString() === d.toDateString();
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, isToday && { borderColor: withAlpha(accent, 0.6) }, pressed && { opacity: 0.7 }]}>
      <View style={styles.date}>
        <Text style={styles.dow}>{DOW[d.getDay()]}</Text>
        <Text style={styles.dayNum}>{d.getDate()}</Text>
      </View>
      {game.opponentLogo ? (
        <Image source={game.opponentLogo} style={styles.logo} contentFit="contain" />
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
  tabs: { flexDirection: 'row', gap: 4, marginBottom: 4 },
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
