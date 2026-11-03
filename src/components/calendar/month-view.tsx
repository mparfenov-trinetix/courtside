import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ArrowLeftIcon } from '@/components/icons';
import { nbaToday, toDateKey, toNbaDateKey } from '@/lib/date';
import type { Game } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WIN = '#34D399';
const LOSS = '#F87171';

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
  teamAbbr,
  accent,
  cursor,
  onCursor,
  selected,
  onPick,
}: {
  games: Game[];
  teamAbbr: string;
  accent: string;
  cursor: Date;
  onCursor: (d: Date) => void;
  selected: Date;
  onPick: (d: Date) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, Game>();
    // Keyed by ESPN's Eastern date so a cell opens the same day's scoreboard.
    for (const g of games) if (g.date) map.set(toNbaDateKey(new Date(g.date)), g);
    return map;
  }, [games]);

  const weeks = useMemo(() => buildGrid(cursor), [cursor]);
  const todayKey = toDateKey(nbaToday());
  const selectedKey = toDateKey(selected);

  const monthGames = games.filter((g) => {
    if (!g.date) return false;
    return toNbaDateKey(new Date(g.date)).startsWith(`${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, '0')}`);
  });
  const wins = monthGames.filter((g) => g.result === 'W').length;
  const losses = monthGames.filter((g) => g.result === 'L').length;

  const shift = (n: number) => onCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
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
            {monthGames.length === 0
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

      <Animated.View key={`${cursor.getFullYear()}-${cursor.getMonth()}`} entering={FadeIn.duration(220)} style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map(({ date, inMonth }) => {
              const key = toDateKey(date);
              const game = byDay.get(key);
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const tint = game?.result === 'W' ? WIN : game?.result === 'L' ? LOSS : accent;
              return (
                <Pressable
                  key={key}
                  onPress={() => onPick(date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTHS[date.getMonth()]} ${date.getDate()}${game ? `, ${game.home ? 'vs' : 'at'} ${game.opponentAbbr}` : ''}`}
                  style={({ pressed }) => [
                    styles.cell,
                    game && { backgroundColor: withAlpha(tint, 0.14) },
                    isSelected && { borderColor: palette.chalk },
                    isToday && !isSelected && { borderColor: withAlpha(palette.chalk, 0.35) },
                    !inMonth && { opacity: 0.28 },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{date.getDate()}</Text>
                  {game ? (
                    <>
                      {game.opponentLogo ? (
                        <Image source={game.opponentLogo} style={styles.opp} contentFit="contain" />
                      ) : (
                        <Text style={styles.oppText}>{game.opponentAbbr}</Text>
                      )}
                      <Text style={[styles.tag, { color: tint }]}>
                        {game.result ?? (game.home ? 'vs' : '@')}
                      </Text>
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      <Text style={styles.legend}>
        {teamAbbr} games · <Text style={{ color: WIN }}>win</Text> · <Text style={{ color: LOSS }}>loss</Text> · tap a day to see
        every game
      </Text>
    </View>
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
    backgroundColor: withAlpha(palette.chalk, 0.07),
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
    height: 66,
    borderRadius: 12,
    alignItems: 'center',
    paddingTop: 5,
    gap: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: withAlpha(palette.chalk, 0.035),
  },
  dayNum: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  dayNumToday: { color: palette.chalk, fontFamily: fonts.bodyBold },
  opp: { width: 22, height: 22 },
  oppText: { fontFamily: fonts.bodyBold, fontSize: 10, color: palette.chalk, marginTop: 4 },
  tag: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.3 },
  legend: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
  },
});
