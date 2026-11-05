import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgendaView, DayPager, MonthView, startOfMonth } from '../../components';
import { router } from 'expo-router';
import { CardIcon, IconButton, Segmented, SeasonSheet, slideIn, ErrorState, ListSkeleton, ScreenHeader } from '@/components';
import { usePostseason, useRefresh, useSeasonGames, useTeam } from '@/hooks';
import { currentSeason } from '@/lib/espn';
import { calendarEvents } from '@/lib/league';
import { localToday, parseEspnDate, toDateKey } from '@/lib/date';
import { fonts, palette, teamTheme } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { PAST, FUTURE } from '../../constants';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** The season a month belongs to, named by the year it ends in (October starts the next one). */
const seasonOfMonth = (d: Date) => d.getFullYear() + (d.getMonth() >= 9 ? 1 : 0);

/** Months a Finals can fall in (April to July; the 2020 bubble ran into October). */
const finalsMonth = (d: Date) => (d.getMonth() >= 3 && d.getMonth() <= 6) || (d.getFullYear() === 2020 && d.getMonth() >= 7 && d.getMonth() <= 9);

/** The days the day view can page through: a month back and five weeks ahead, longer when a month pick lands outside that. */
function buildDates(extra: Date | null): Date[] {
  const today = localToday();
  let from = -PAST;
  let to = FUTURE;
  if (extra) {
    const days = Math.round((extra.getTime() - today.getTime()) / 86_400_000);
    from = Math.min(from, days - 3);
    to = Math.max(to, days + 3);
  }
  const dates: Date[] = [];
  for (let i = from; i <= to; i++) dates.push(addDays(today, i));
  return dates;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Mode = 'day' | 'month' | 'agenda';

const MODES: { key: Mode; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' },
  { key: 'agenda', label: 'Agenda' },
];

export function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const currentTeamId = useTeamStore((s) => s.currentTeamId);
  const team = useTeam(currentTeamId);
  const theme = teamTheme(team);

  const today = useMemo(() => localToday(), []);
  // A month pick far outside the usual range widens the pager's days to include it.
  const [extra, setExtra] = useState<Date | null>(null);
  const dates = useMemo(() => buildDates(extra), [extra]);
  const [mode, setMode] = useState<Mode>('day');
  const [slide, setSlide] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<Date>(today);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  // Month and Agenda read the season they are showing: the month in view decides one, the season button the other,
  // so browsing back through old months (or picking an old season) loads that season's whole schedule.
  const [agendaSeason, setAgendaSeason] = useState(currentSeason);
  const [seasonSheet, setSeasonSheet] = useState(false);
  const monthSeason = seasonOfMonth(cursor);
  const monthGames = useSeasonGames(currentTeamId, monthSeason);
  const agendaGames = useSeasonGames(currentTeamId, agendaSeason);
  // The All-Star Game and the Finals are marked for every team. The Finals come from the season's playoff games, which
  // are only read once a month that can hold them is on screen (the Playoffs screen shares the same cache).
  const postseason = usePostseason(monthSeason, mode === 'month' && finalsMonth(cursor));
  const events = useMemo(() => calendarEvents(monthSeason, postseason.data?.playoffs), [monthSeason, postseason.data]);
  const viewedSeason = mode === 'agenda' ? agendaSeason : monthSeason;
  const scheduleRefresh = useRefresh([['teamSeason', currentTeamId, viewedSeason]], viewedSeason === currentSeason());

  // The days the selected team plays (on the device's calendar), marked under the day pills.
  const strip = useSeasonGames(currentTeamId, seasonOfMonth(today));
  const gameDays = useMemo(() => new Set((strip.data ?? []).filter((g) => g.date).map((g) => toDateKey(parseEspnDate(g.date)))), [strip.data]);

  const goToday = () => {
    setSelected(today);
    setCursor(startOfMonth(today));
  };

  const pickDay = (d: Date) => {
    const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (days < -PAST || days > FUTURE) setExtra(d);
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
      <ScreenHeader
        title="Calendar"
        color={palette.chalk}
        right={headerRight}
        // The other main screen, one tap away.
        afterMenu={
          <IconButton label="Open the team card" onPress={() => router.navigate('/home')}>
            <CardIcon color={palette.chalk} />
          </IconButton>
        }
      />

      {/* View switch */}
      <Segmented
        style={{ marginBottom: 8 }}
        options={MODES}
        value={mode}
        onChange={(key, direction) => {
          setSlide(direction);
          setMode(key);
        }}
      />

      {/* Content slides in from the side the switcher moved toward */}
      <Animated.View key={mode} entering={slideIn(slide)} style={styles.view}>
      {mode === 'day' && <DayPager dates={dates} today={today} selected={selected} onSelect={setSelected} accent={theme.accent} gameDays={gameDays} />}

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
            games={monthGames.data ?? []}
            loading={monthGames.isPending}
            events={events}
            teamAbbr={team?.abbreviation ?? ''}
            accent={theme.accent}
            cursor={cursor}
            onCursor={setCursor}
            selected={selected}
            onPick={pickDay}
          />
        </ScrollView>
      ) : mode === 'agenda' ? (
        agendaGames.isPending ? (
          <ListSkeleton count={6} />
        ) : agendaGames.error ? (
          <ErrorState message={agendaGames.error.message} onRetry={agendaGames.refetch} />
        ) : (
          <AgendaView
            // A new season starts afresh: a past one opens on its results, the current one on what is next.
            key={agendaSeason}
            games={agendaGames.data ?? []}
            teamAbbr={team?.abbreviation ?? ''}
            accent={theme.accent}
            season={agendaSeason}
            onSeasonPress={() => setSeasonSheet(true)}
            refreshControl={scheduleRefresh}
          />
        )
      ) : null}
      </Animated.View>

      <SeasonSheet
        visible={seasonSheet}
        season={agendaSeason}
        onPick={(year) => {
          setAgendaSeason(year);
          setSeasonSheet(false);
        }}
        onClose={() => setSeasonSheet(false)}
      />
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
  view: { flex: 1 },
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
