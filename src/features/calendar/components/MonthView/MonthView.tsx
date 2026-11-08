import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ArrowLeftIcon, LarryOBrienIcon, NbaLogo, slideIn, StarIcon } from '@/components';
import { useTeams } from '@/hooks';
import { localToday, parseEspnDate, toDateKey } from '@/lib/date';
import type { Game } from '@/lib/espn';
import type { CalendarEvent } from '@/lib/league';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';
import { opponentLook } from '../../utils';
import { DOW, GOLD, MONTHS, WIN, LOSS } from './constants';

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

type Cell = { date: Date; inMonth: boolean };

function buildGrid(cursor: Date): Cell[][] {
  const first = startOfMonth(cursor);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const weeks: Cell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Cell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + i);
      row.push({ date, inMonth: date.getMonth() === first.getMonth() });
    }
    // Skip a trailing week that is entirely the next month.
    if (w === 5 && row.every((c) => !c.inMonth)) break;
    weeks.push(row);
  }
  return weeks;
}

/** A month grid for the selected team's season: opponent logos on game days, tinted by result. */
export function MonthView({
  games,
  loading,
  events,
  teamAbbr,
  accent,
  cursor,
  onCursor,
  selected,
  onPick,
}: {
  games: Game[];
  /** The month's season is still being fetched, so an empty month is not yet "no games". */
  loading?: boolean;
  /** League-wide days to mark (the All-Star Game, Finals games), by scoreboard day, whichever team is followed. */
  events?: Record<string, CalendarEvent>;
  teamAbbr: string;
  accent: string;
  cursor: Date;
  onCursor: (d: Date) => void;
  selected: Date;
  onPick: (d: Date) => void;
}) {
  const { data: teams } = useTeams();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const byDay = useMemo(() => {
    const map = new Map<string, Game>();
    // Keyed by the day on the device's own calendar, the one a cell stands for.
    for (const g of games) if (g.date) map.set(toDateKey(parseEspnDate(g.date)), g);
    return map;
  }, [games]);

  const weeks = useMemo(() => buildGrid(cursor), [cursor]);
  const todayKey = toDateKey(localToday());
  const selectedKey = toDateKey(selected);

  const monthGames = games.filter((g) => {
    if (!g.date) return false;
    return toDateKey(parseEspnDate(g.date)).startsWith(`${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, '0')}`);
  });
  const wins = monthGames.filter((g) => g.result === 'W').length;
  const losses = monthGames.filter((g) => g.result === 'L').length;

  const prefix = `${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, '0')}`;
  const marked = Object.entries(events ?? {}).filter(([k]) => k.startsWith(prefix)).map(([, e]) => e.kind);
  const markedLabel = [marked.includes('allstar') && 'All-Star', marked.includes('finals') && 'Finals'].filter(Boolean).join(' · ');

  // The grid takes the room there is: the screen less the header, switch, month bar, weekday row and legend (about 250pt).
  const cellHeight = Math.max(66, Math.min(120, Math.floor((screenHeight - insets.top - insets.bottom - 250) / weeks.length) - 4));

  // The month slides in from the side it lies on, whether an arrow or a swipe moved to it.
  const [direction, setDirection] = useState<1 | -1>(1);
  const shift = (n: number) => {
    setDirection(n > 0 ? 1 : -1);
    onCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  };
  // A sideways swipe on the month goes to the next or previous one (the page still scrolls up and down).
  const swipe = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onDeactivate: (e) => {
      'worklet';
      if (Math.abs(e.translationX) > 70 || Math.abs(e.velocityX) > 700) scheduleOnRN(shift, e.translationX < 0 ? 1 : -1);
    },
  });

  return (
    <GestureDetector gesture={swipe}>
    <View style={styles.wrap}>
      <View style={styles.monthBar}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityLabel="Previous month" style={styles.navBtn}>
          <ArrowLeftIcon size={18} color={palette.chalk} />
        </Pressable>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle}>
            {MONTHS[cursor.getMonth()]} <Text style={styles.monthYear}>{cursor.getFullYear()}</Text>
          </Text>
          <Text style={styles.monthSub}>
            {loading
              ? 'Loading…'
              : monthGames.length === 0
              ? `No ${teamAbbr} games`
              : `${monthGames.length} ${teamAbbr} game${monthGames.length === 1 ? '' : 's'}` +
                (wins + losses > 0 ? ` · ${wins}–${losses}` : '')}
          </Text>
        </View>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityLabel="Next month" style={styles.navBtn}>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <ArrowLeftIcon size={18} color={palette.chalk} />
          </View>
        </Pressable>
      </View>

      <View style={styles.dowRow}>
        {DOW.map((d, i) => (
          <Text key={i} style={styles.dow}>{d}</Text>
        ))}
      </View>

      <Animated.View key={`${cursor.getFullYear()}-${cursor.getMonth()}`} entering={slideIn(direction)} style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map(({ date, inMonth }) => {
              const key = toDateKey(date);
              const game = byDay.get(key);
              const event = events?.[key];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const tint = game?.result === 'W' ? WIN : game?.result === 'L' ? LOSS : accent;
              // What is still to come is dressed in the opponent's colors, so the month reads as a run of matchups; what has been
              // played is dressed in the result (green win, red loss), so how the season went shows at a glance.
              const look = game ? opponentLook(teams, game.opponentId, game.opponentLogo) : null;
              const played = !!game?.result;
              const wash = played ? tint : look?.color ?? tint;
              return (
                <Pressable
                  key={key}
                  onPress={() => onPick(date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTHS[date.getMonth()]} ${date.getDate()}${game ? `, ${game.home ? 'vs' : 'at'} ${game.opponentAbbr}` : ''}${event ? `, ${event.kind === 'allstar' ? 'All-Star Game' : `NBA Finals ${event.label}`}` : ''}`}
                  style={({ pressed }) => [
                    styles.cell,
                    { height: cellHeight },
                    game && { backgroundColor: withAlpha(wash, 0.16) },
                    played && { borderColor: withAlpha(tint, 0.55) },
                    event && { borderColor: withAlpha(GOLD, 0.6), backgroundColor: game ? withAlpha(wash, 0.16) : withAlpha(GOLD, 0.12) },
                    isSelected && { borderColor: palette.chalk },
                    isToday && !isSelected && { borderColor: withAlpha(palette.chalk, 0.35) },
                    !inMonth && { opacity: 0.28 },
                    pressed && { opacity: 0.6 },
                  ]}>
                  {look || played ? (
                    <LinearGradient
                      colors={[withAlpha(wash, played ? 0.62 : 0.55), withAlpha(wash, played ? 0.2 : 0.12)]}
                      start={{ x: 0.1, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <Text style={[styles.dayNum, game && { color: withAlpha(palette.chalk, 0.85) }, isToday && styles.dayNumToday]}>{date.getDate()}</Text>
                  {event && !game ? (
                    <>
                      {event.kind === 'allstar' ? (
                        // ESPN's NBA logo with a gold star: the league's own mark, marked as the All-Star Game.
                        <View style={styles.allStar}>
                          <NbaLogo size={20} />
                          <StarIcon size={11} color={GOLD} filled />
                        </View>
                      ) : (
                        <LarryOBrienIcon size={27} color={GOLD} />
                      )}
                      <Text style={[styles.tag, { color: GOLD }]}>{event.label}</Text>
                    </>
                  ) : null}
                  {/* A game of the followed team on the same day keeps its logo; the mark moves to the corner. */}
                  {event && game ? (
                    <View style={styles.badge}>
                      {event.kind === 'allstar' ? <StarIcon size={11} color={GOLD} filled /> : <LarryOBrienIcon size={13} color={GOLD} />}
                    </View>
                  ) : null}
                  {game ? (
                    <>
                      {look?.logo || game.opponentLogo ? (
                        <Image source={look?.logo || game.opponentLogo} style={styles.opp} contentFit="contain" />
                      ) : (
                        <Text style={styles.oppText}>{game.opponentAbbr}</Text>
                      )}
                      {played ? (
                        <Text style={[styles.result, { backgroundColor: tint }]}>{game.result}</Text>
                      ) : (
                        <Text style={[styles.tag, { color: withAlpha(palette.chalk, 0.75) }]}>{game.home ? 'vs' : '@'}</Text>
                      )}
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      <Text style={styles.legend}>
        {teamAbbr} games · <Text style={{ color: WIN }}>win</Text> · <Text style={{ color: LOSS }}>loss</Text>
        {markedLabel ? <Text style={{ color: GOLD }}> · {markedLabel}</Text> : null} · swipe for another month
      </Text>
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 8 },
  monthBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 12 },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surfaces.raised,
  },
  monthTitleWrap: { flex: 1, alignItems: 'center' },
  monthTitle: { fontFamily: fonts.display, fontSize: 26, color: palette.chalk },
  monthYear: { color: palette.muted },
  monthSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, letterSpacing: 0.3 },
  dowRow: { flexDirection: 'row', paddingBottom: 6 },
  dow: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  grid: { gap: 4 },
  week: { flexDirection: 'row', gap: 4 },
  cell: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingTop: 6,
    gap: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: surfaces.faint,
  },
  dayNum: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  dayNumToday: { color: palette.chalk, fontFamily: fonts.bodyBold },
  opp: { width: 30, height: 30 },
  oppText: { fontFamily: fonts.bodyBold, fontSize: 10, color: palette.chalk, marginTop: 4 },
  tag: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },
  // The result of a game played: a solid chip in the win or loss color.
  result: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#06121F', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 7, overflow: 'hidden' },
  allStar: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  badge: { position: 'absolute', top: 4, right: 4 },
  legend: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
  },
});
