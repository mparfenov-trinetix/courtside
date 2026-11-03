import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgendaView } from '@/components/calendar/agenda-view';
import { MonthView, startOfMonth } from '@/components/calendar/month-view';
import { FlashOverlay, Tick } from '@/components/live-flash';
import { ErrorState, LoadingState, ScreenHeader } from '@/components/ui';
import { useScoreboardByDate, useTeam, useTeamSchedule } from '@/hooks/queries';
import { useRefresh } from '@/hooks/use-refresh';
import { involvesTeam, type ScoreboardGame } from '@/lib/espn';
import { nbaToday, toDateKey } from '@/lib/date';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state/team-store';

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
  const today = nbaToday();
  const dates: Date[] = [];
  for (let i = -PAST; i <= FUTURE; i++) dates.push(addDays(today, i));
  return dates;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Mode = 'day' | 'month' | 'agenda';

const MODES: { key: Mode; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' },
  { key: 'agenda', label: 'Agenda' },
];

const PILL = 48;
const PILL_GAP = 6;

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { currentTeamId } = useTeamStore();
  const team = useTeam(currentTeamId);
  const theme = teamTheme(team);
  const { data: schedule } = useTeamSchedule(currentTeamId);
  const scheduleRefresh = useRefresh([['schedule']]);

  const today = useMemo(() => nbaToday(), []);
  const dates = useMemo(() => buildDates(), []);
  const [mode, setMode] = useState<Mode>('day');
  const [selected, setSelected] = useState<Date>(today);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const dateKey = toDateKey(selected);

  const { data: scoreboard, isPending, error, refetch } = useScoreboardByDate(dateKey);
  // The selected team's game leads the list; Array.sort is stable, so the rest keep ESPN's order.
  const games = scoreboard && [...scoreboard].sort((a, b) => Number(involvesTeam(b, currentTeamId)) - Number(involvesTeam(a, currentTeamId)));
  const refreshControl = useRefresh([['scoreboard', dateKey]]);

  const dateListRef = useRef<FlatList>(null);
  const centered = useRef(false);

  const scrollToDate = useCallback((d: Date, animated: boolean) => {
    const index = dates.findIndex((x) => x.getTime() === d.getTime());
    if (index >= 0) dateListRef.current?.scrollToIndex({ index, animated, viewPosition: 0.5 });
  }, [dates]);

  const isToday = (d: Date) => d.getTime() === today.getTime();
  const isPast = (d: Date) => d < today;

  const goToday = () => {
    setSelected(today);
    setCursor(startOfMonth(today));
    if (mode === 'day') scrollToDate(today, true);
  };

  const pickDay = (d: Date) => {
    centered.current = false;
    setSelected(d);
    setMode('day');
  };

  const headerRight =
    mode === 'agenda' ? undefined : (
      <Pressable onPress={goToday} hitSlop={8}>
        <Text style={styles.todayBtn}>Today</Text>
      </Pressable>
    );

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Calendar" color={palette.chalk} right={headerRight} />

      {/* View switch */}
      <View style={styles.switch}>
        {MODES.map((m) => {
          const active = m.key === mode;
          return (
            <Pressable
              key={m.key}
              onPress={() => {
                if (m.key === 'day') centered.current = false;
                setMode(m.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.switchBtn, active && styles.switchBtnActive]}>
              <Text style={[styles.switchLabel, { color: active ? palette.chalk : palette.muted }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'day' && (
        <>
          {/* Date strip */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.strip}>
            <FlatList
              ref={dateListRef}
              data={dates}
              horizontal
              keyExtractor={(d) => d.toISOString()}
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: PILL + PILL_GAP, offset: 16 + index * (PILL + PILL_GAP), index })}
              // Centre the selected day once laid out; initialScrollIndex would pin it flush to the left edge.
              onLayout={() => {
                if (centered.current) return;
                centered.current = true;
                const inRange = dates.some((x) => x.getTime() === selected.getTime());
                scrollToDate(inRange ? selected : today, false);
              }}
              onScrollToIndexFailed={() => {
                setTimeout(() => scrollToDate(today, false), 100);
              }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: PILL_GAP }}
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
              refreshControl={refreshControl}
              contentContainerStyle={[styles.gamesList, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}>
              {games.map((game, i) => (
                <Animated.View key={game.id} entering={FadeInDown.delay(i * 40).duration(260)}>
                  <GameCard game={game} mine={involvesTeam(game, currentTeamId)} accent={theme.accent} abbr={team?.abbreviation} />
                </Animated.View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {mode !== 'day' && !team ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Pick a team</Text>
          <Text style={styles.emptyText}>Month and agenda views show one team&apos;s season.</Text>
        </View>
      ) : mode === 'month' ? (
        <ScrollView
          refreshControl={scheduleRefresh}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}>
          <MonthView
            games={schedule ?? []}
            teamAbbr={team?.abbreviation ?? ''}
            accent={theme.accent}
            cursor={cursor}
            onCursor={setCursor}
            selected={selected}
            onPick={pickDay}
          />
        </ScrollView>
      ) : mode === 'agenda' ? (
        <AgendaView
          games={schedule ?? []}
          teamAbbr={team?.abbreviation ?? ''}
          accent={theme.accent}
          refreshControl={scheduleRefresh}
        />
      ) : null}
    </View>
  );
}

// ─── Game card ────────────────────────────────────────────────────────────────

function GameCard({ game, mine, accent, abbr }: { game: ScoreboardGame; mine: boolean; accent: string; abbr?: string }) {
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
      style={({ pressed }) => [
        styles.card,
        mine && { borderColor: withAlpha(accent, 0.7), backgroundColor: withAlpha(accent, 0.1) },
        pressed && { opacity: 0.75 },
      ]}>
      <FlashOverlay radius={18} signature={`${away.score ?? ''}-${home.score ?? ''}-${status}`} />
      <TeamRow team={away} winner={away.winner} completed={completed} />

      <View style={styles.cardDivider} />

      <TeamRow team={home} winner={home.winner} completed={completed} />

      <View style={styles.cardStatus}>
        <Tick style={[styles.statusText, { color: statusColor }]} value={status} />
        {mine && abbr ? <Text style={[styles.mineTag, { color: accent }]}>★ {abbr}</Text> : null}
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
        <Tick
          style={[styles.teamScore, { fontFamily: scoreFontFamily, color: winner ? palette.chalk : withAlpha(palette.chalk, 0.6) }]}
          value={Math.round(team.score)}
        />
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
  switch: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 3,
    borderRadius: 14,
    backgroundColor: withAlpha(palette.chalk, 0.07),
    marginBottom: 6,
  },
  switchBtn: { paddingHorizontal: 22, paddingVertical: 7, borderRadius: 11 },
  switchBtnActive: { backgroundColor: withAlpha(palette.chalk, 0.16) },
  switchLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  strip: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha(palette.chalk, 0.08),
  },
  datePill: {
    width: PILL,
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
  mineTag: { marginLeft: 'auto', fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.3 },
  card: {
    borderWidth: 1,
    borderColor: 'transparent',
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
