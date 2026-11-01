import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState, ScreenHeader } from '@/components/ui';
import { useScoreboardByDate } from '@/hooks/queries';
import type { ScoreboardGame } from '@/lib/espn';
import { toDateKey } from '@/lib/date';
import { fonts, palette, withAlpha } from '@/lib/theme';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAST = 30;
const FUTURE = 14;

function buildDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = -PAST; i <= FUTURE; i++) dates.push(addDays(today, i));
  return dates;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const dates = useMemo(() => buildDates(), []);
  const [selected, setSelected] = useState<Date>(today);
  const dateKey = toDateKey(selected);

  const { data: games, isPending, error, refetch } = useScoreboardByDate(dateKey);

  const dateListRef = useRef<FlatList>(null);
  const todayIndex = PAST; // offset of today in the dates array

  const scrollToToday = useCallback(() => {
    dateListRef.current?.scrollToIndex({ index: todayIndex, animated: true, viewPosition: 0.5 });
  }, [todayIndex]);

  const isToday = (d: Date) => d.getTime() === today.getTime();
  const isPast = (d: Date) => d < today;

  const headerRight = (
    <Pressable onPress={scrollToToday} hitSlop={8}>
      <Text style={styles.todayBtn}>Today</Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Calendar" color={palette.chalk} right={headerRight} />

      {/* Date strip */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.strip}>
        <FlatList
          ref={dateListRef}
          data={dates}
          horizontal
          keyExtractor={(d) => d.toISOString()}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={todayIndex}
          getItemLayout={(_, index) => ({ length: 54, offset: 12 + index * 54, index })}
          onScrollToIndexFailed={() => {
            // fallback: scroll after a tick
            setTimeout(() => {
              dateListRef.current?.scrollToIndex({ index: todayIndex, animated: false, viewPosition: 0.5 });
            }, 100);
          }}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          renderItem={({ item: d }) => {
            const sel = d.getTime() === selected.getTime();
            const tod = isToday(d);
            return (
              <Pressable
                onPress={() => setSelected(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={[
                  styles.datePill,
                  sel && { backgroundColor: palette.chalk },
                  !sel && isPast(d) && { opacity: 0.55 },
                ]}>
                <Text style={[styles.dateDow, { color: sel ? palette.arena : (tod ? palette.chalk : palette.muted) }]}>
                  {tod ? 'TDY' : DOW[d.getDay()]}
                </Text>
                <Text style={[styles.dateNum, { color: sel ? palette.arena : palette.chalk }]}>
                  {d.getDate()}
                </Text>
                <Text style={[styles.dateMon, { color: sel ? withAlpha(palette.arena, 0.6) : palette.muted }]}>
                  {MON[d.getMonth()]}
                </Text>
              </Pressable>
            );
          }}
        />
      </Animated.View>

      {/* Date label */}
      <Animated.View key={`label-${dateKey}`} entering={FadeIn.duration(200)} style={styles.dateLabel}>
        <Text style={styles.dateLabelText}>
          {isToday(selected)
            ? 'Today'
            : `${DOW[selected.getDay()]}, ${MON[selected.getMonth()]} ${selected.getDate()}`}
        </Text>
      </Animated.View>

      {/* Games */}
      {isPending ? (
        <LoadingState label="Loading games" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !games || games.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No games</Text>
          <Text style={styles.emptyText}>
            {selected < today ? 'No games were played on this date.' : 'No games scheduled yet.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          key={`list-${dateKey}`}
          contentContainerStyle={[styles.gamesList, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}>
          {games.map((game, i) => (
            <Animated.View key={game.id} entering={FadeInDown.delay(i * 40).duration(260)}>
              <GameCard game={game} />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Game card ────────────────────────────────────────────────────────────────

function GameCard({ game }: { game: ScoreboardGame }) {
  const { home, away, status, completed, inProgress } = game;

  const statusColor = inProgress
    ? '#4ADE80'
    : completed
    ? withAlpha(palette.chalk, 0.45)
    : withAlpha(palette.chalk, 0.6);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
      <TeamRow team={away} winner={away.winner} completed={completed} />

      <View style={styles.cardDivider} />

      <TeamRow team={home} winner={home.winner} completed={completed} />

      <View style={styles.cardStatus}>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        {inProgress && <View style={styles.liveDot} />}
      </View>
    </Pressable>
  );
}

function TeamRow({
  team,
  winner,
  completed,
}: {
  team: ScoreboardGame['home'];
  winner?: boolean;
  completed: boolean;
}) {
  const scoreFontFamily = winner ? fonts.bodyBold : fonts.bodySemi;
  const nameColor = completed && !winner ? withAlpha(palette.chalk, 0.55) : palette.chalk;

  return (
    <View style={styles.teamRow}>
      {team.logo ? (
        <Image source={team.logo} style={styles.teamLogo} contentFit="contain" />
      ) : (
        <View style={[styles.teamLogo, { backgroundColor: withAlpha(palette.chalk, 0.08), borderRadius: 20 }]} />
      )}
      <Text style={[styles.teamName, { color: nameColor }]} numberOfLines={1}>
        {team.abbreviation || team.name}
      </Text>
      {team.score != null && (
        <Text style={[styles.teamScore, { fontFamily: scoreFontFamily, color: winner ? palette.chalk : withAlpha(palette.chalk, 0.6) }]}>
          {Math.round(team.score)}
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  todayBtn: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: palette.chalk,
    paddingHorizontal: 4,
  },
  strip: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha(palette.chalk, 0.08),
  },
  datePill: {
    width: 48,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    gap: 2,
    backgroundColor: withAlpha(palette.chalk, 0.06),
  },
  dateDow: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  dateNum: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 22,
  },
  dateMon: {
    fontFamily: fonts.body,
    fontSize: 10,
  },
  dateLabel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateLabelText: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: palette.chalk,
  },
  gamesList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    backgroundColor: withAlpha('#FFFFFF', 0.06),
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withAlpha(palette.chalk, 0.1),
    marginHorizontal: -16,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  teamLogo: {
    width: 32,
    height: 32,
  },
  teamName: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
  },
  teamScore: {
    fontSize: 22,
    fontFamily: fonts.bodySemi,
    color: palette.chalk,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: palette.chalk,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
  },
});
