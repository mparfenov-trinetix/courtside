import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Segmented, ErrorState, ListSkeleton, ScreenHeader , SeasonButton, SeasonSheet } from '@/components';
import { useRefresh, useStandings, useTeams } from '@/hooks';
import { currentSeason, type StandingEntry } from '@/lib/espn';
import { hasPlayIn } from '@/lib/league';
import { fonts, matchupColors, palette, teamTheme, withAlpha, surfaces } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { goBack, openDetail, sharedTag } from '@/navigation';

type Conference = 'league' | 'east' | 'west';

const COL = { w: 30, l: 30, pct: 44, gb: 38, strk: 40 };

const TABS: { key: Conference; label: string }[] = [
  { key: 'league', label: 'League' },
  { key: 'east', label: 'Eastern' },
  { key: 'west', label: 'Western' },
];

/** Standings for any recent season. Playoffs, play-in and the NBA Cup have their own screens. */
/** `pushed`: opened on top of another page (a game), so the header's button goes back instead of opening the menu. */
export function StandingsScreen({ pushed = false }: { pushed?: boolean }) {
  // Opened from a game: `teams` are the two teams to light up (comma separated ids) and `season` the game's season.
  const params = useLocalSearchParams<{ teams?: string; season?: string }>();
  const highlight = (params.teams ?? '').split(',').filter(Boolean);
  const paramSeason = params.season ? Number(params.season) : currentSeason();
  const [picked, setPicked] = useState<{ from: number; season: number } | null>(null);
  // A new link wins over an earlier manual pick; a manual pick holds until the next link.
  const season = picked && picked.from === paramSeason ? picked.season : paramSeason;
  const setSeason = (s: number) => setPicked({ from: paramSeason, season: s });
  const [picking, setPicking] = useState(false);
  // Lives here, not in the table: the table is re-created for every season, which used to reset the tab.
  const [chosen, setChosen] = useState<{ key: string; conf: Conference } | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Standings" color={palette.chalk} onBack={pushed ? goBack : undefined} right={<SeasonButton season={season} onPress={() => setPicking(true)} />} />
      {/* Keyed by season, so switching replays the entrance instead of silently swapping data */}
      <Animated.View key={season} entering={FadeIn.duration(240)} style={{ flex: 1 }}>
        <StandingsTable season={season} highlight={highlight} chosen={chosen} setChosen={setChosen} />
      </Animated.View>
      <SeasonSheet visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}

function StandingsTable({
  season,
  highlight,
  chosen,
  setChosen,
}: {
  season: number;
  highlight: string[];
  chosen: { key: string; conf: Conference } | null;
  setChosen: (c: { key: string; conf: Conference }) => void;
}) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<StandingEntry | { sectionTitle: string }>>(null);
  const scrolled = useRef('');
  const { data: teams } = useTeams();
  const highlightKey = highlight.join(',');
  const past = season !== currentSeason();
  const { data, isPending, error, refetch } = useStandings(season);
  const refreshControl = useRefresh([['standings']], !past);

  // "League" is all 30 teams ranked together by win %, then wins, then point differential.
  const league: StandingEntry[] = [...(data?.east ?? []), ...(data?.west ?? [])]
    .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || b.diff - a.diff)
    .map((e, i) => ({ ...e, seed: i + 1 }));
  // Both highlighted teams in one conference: open that table. Different conferences: the league table shows both.
  const confOf = (id: string): Conference | null => (data?.east.some((e) => e.teamId === id) ? 'east' : data?.west.some((e) => e.teamId === id) ? 'west' : null);
  const confs = new Set(highlight.map(confOf).filter((c): c is Conference => c != null));
  const suggested: Conference = highlight.length === 0 ? 'east' : confs.size === 1 ? [...confs][0] : 'league';
  const conf = chosen && chosen.key === highlightKey ? chosen.conf : suggested;
  const setConf = (c: Conference) => setChosen({ key: highlightKey, conf: c });
  const colors: Record<string, string> = {};
  const picks = highlight.map((id) => teams?.find((t) => t.id === id)).filter((t) => t != null);
  if (picks.length === 2) {
    const m = matchupColors(picks[0], picks[1]);
    colors[picks[0].id] = m.away;
    colors[picks[1].id] = m.home;
  } else {
    for (const t of picks) colors[t.id] = teamTheme(t).accent;
  }
  const isLeague = conf === 'league';
  const entries: StandingEntry[] = isLeague ? league : (data?.[conf] ?? []);

  type Section = { title: string; data: StandingEntry[] };
  const sections: Section[] = [];
  // Before 2020-21 there was no play-in: the top eight made the playoffs and the rest were out.
  const playInSeason = hasPlayIn(season);
  const playoff = entries.filter((e) => e.seed <= (playInSeason ? 6 : 8));
  const playIn = playInSeason ? entries.filter((e) => e.seed >= 7 && e.seed <= 10) : [];
  const eliminated = entries.filter((e) => e.seed >= (playInSeason ? 11 : 9));
  if (playoff.length) sections.push({ title: 'Playoff', data: playoff });
  if (playIn.length) sections.push({ title: 'Play-In', data: playIn });
  if (eliminated.length) sections.push({ title: 'Out', data: eliminated });

  // How far each team is from the line that matters to it: the 6th seed (straight into the
  // playoffs) and the 10th (last play-in spot). Positive = cushion, negative = ground to make up.
  const gamesFrom = (a: StandingEntry, b?: StandingEntry) => (b ? (a.wins - b.wins + (b.losses - a.losses)) / 2 : 0);
  const bySeed = (n: number) => entries.find((e) => e.seed === n);
  const cutLabel = (e: StandingEntry): string | null => {
    // The cut-line notes are about a race still being run, so they only make sense for the current season.
    if (past || isLeague || entries.length < 11 || e.wins + e.losses === 0) return null;
    const fmt = (n: number) => Math.abs(n).toFixed(1).replace(/\.0$/, '');
    if (e.seed <= 6) {
      const cushion = gamesFrom(e, bySeed(7));
      return cushion > 0 ? `${fmt(cushion)} clear of play-in` : null;
    }
    if (e.seed <= 10) {
      const back = gamesFrom(bySeed(6)!, e);
      return back > 0 ? `${fmt(back)} back of top 6` : 'level with top 6';
    }
    const back = gamesFrom(bySeed(10)!, e);
    return back > 0 ? `${fmt(back)} back of play-in` : 'level with play-in';
  };

  const flat: (StandingEntry | { sectionTitle: string })[] = isLeague
    ? entries
    : sections.flatMap((s) => [{ sectionTitle: s.title }, ...s.data]);

  // Position among the team rows only (for the staggered entrance); worked out once, not per row.
  const rowIndexOf = new Map<object, number>();
  for (const f of flat) if (!('sectionTitle' in f)) rowIndexOf.set(f, rowIndexOf.size);

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.tabs}>
        <Segmented options={TABS} value={conf} onChange={(key) => setConf(key)} segmentWidth={96} />
      </Animated.View>

      {isPending ? (
        <ListSkeleton count={10} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          key={conf}
          ref={listRef}
          data={flat}
          // Bring the highlighted teams into view once, when the list first has its size.
          onContentSizeChange={() => {
            const mark = `${conf}:${highlightKey}`;
            if (highlight.length === 0 || scrolled.current === mark) return;
            const at = flat.findIndex((f) => !('sectionTitle' in f) && highlight.includes(f.teamId));
            if (at < 0) return;
            scrolled.current = mark;
            listRef.current?.scrollToIndex({ index: at, viewPosition: 0.3, animated: false });
          }}
          onScrollToIndexFailed={(info) => listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false })}
          refreshControl={refreshControl}
          keyExtractor={(item, i) => ('sectionTitle' in item ? `header-${item.sectionTitle}` : `${item.teamId}-${i}`)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 6 }}
          ListHeaderComponent={<ColumnHeader />}
          renderItem={({ item }) => {
            if ('sectionTitle' in item) {
              return <SectionDivider title={item.sectionTitle} />;
            }
            const rowIndex = rowIndexOf.get(item) ?? 0;
            return <TeamRow entry={item} index={rowIndex} cut={cutLabel(item)} highlight={colors[item.teamId]} />;
          }}
        />
      )}
    </View>
  );
}

function ColumnHeader() {
  return (
    <View style={styles.columnHeader}>
      <Text style={[styles.colHeaderText, { flex: 1 }]} />
      <Text style={[styles.colHeaderText, { width: COL.w }]}>W</Text>
      <Text style={[styles.colHeaderText, { width: COL.l }]}>L</Text>
      <Text style={[styles.colHeaderText, { width: COL.pct }]}>PCT</Text>
      <Text style={[styles.colHeaderText, { width: COL.gb }]}>GB</Text>
      <Text style={[styles.colHeaderText, { width: COL.strk }]}>STRK</Text>
    </View>
  );
}

function SectionDivider({ title }: { title: string }) {
  const accent =
    title === 'Playoff' ? palette.win : title === 'Play-In' ? palette.gold : palette.muted;
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: withAlpha(accent, 0.25) }]} />
      <Text style={[styles.dividerLabel, { color: accent }]}>{title}</Text>
      <View style={[styles.dividerLine, { backgroundColor: withAlpha(accent, 0.25) }]} />
    </View>
  );
}

function TeamRow({ entry, index, cut, highlight }: { entry: StandingEntry; index: number; cut: string | null; highlight?: string }) {
  const favoriteTeamId = useTeamStore((s) => s.favoriteTeamId);
  const gbText = entry.gamesBehind === 0 ? '—' : entry.gamesBehind.toFixed(1);
  const pctText = entry.winPct.toFixed(3).replace(/^0/, '');
  const streakColor = entry.streak.startsWith('W') ? palette.win : entry.streak.startsWith('L') ? palette.loss : palette.muted;
  const diff = `${entry.diff > 0 ? '+' : ''}${entry.diff.toFixed(1)}`;
  const details = [entry.lastTen && entry.wins + entry.losses >= 10 ? `Last 10: ${entry.lastTen}` : null, entry.diff !== 0 ? `${diff} pts/g` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 14) * 20).duration(260).easing(Easing.out(Easing.cubic))}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          openDetail({ pathname: '/team/[id]', params: { id: entry.teamId, o: 'standings' } });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Open ${entry.teamName}`}
        style={({ pressed }) => [
          styles.row,
          highlight ? { backgroundColor: withAlpha(highlight, 0.2), borderWidth: 1.5, borderColor: withAlpha(highlight, 0.85) } : null,
          pressed && { opacity: 0.7 },
        ]}>
        <Text style={styles.seed}>{entry.seed}</Text>
        {entry.teamLogo ? (
          <Animated.View sharedTransitionTag={sharedTag('standings', 'team', entry.teamId, 'logo')} style={styles.logo}>
            <Image source={entry.teamLogo} style={StyleSheet.absoluteFill} contentFit="contain" />
          </Animated.View>
        ) : (
          <View style={[styles.logo, { backgroundColor: surfaces.raised, borderRadius: 14 }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName} numberOfLines={1}>
            {entry.teamAbbr || entry.teamName}
            {entry.teamId === favoriteTeamId ? '  ★' : ''}
          </Text>
          {details ? <Text style={styles.teamDetail} numberOfLines={1}>{details}</Text> : null}
          {cut ? <Text style={styles.teamCut} numberOfLines={1}>{cut}</Text> : null}
        </View>
        <Text style={[styles.stat, { width: COL.w }]}>{entry.wins}</Text>
        <Text style={[styles.stat, { width: COL.l }]}>{entry.losses}</Text>
        <Text style={[styles.stat, { width: COL.pct }]}>{pctText}</Text>
        <Text style={[styles.stat, { width: COL.gb, color: palette.muted }]}>{gbText}</Text>
        <Text style={[styles.stat, { width: COL.strk, color: streakColor, fontFamily: fonts.bodyBold }]}>{entry.streak || '–'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingHorizontal: 12,
    paddingBottom: 4,
    paddingTop: 2,
  },
  colHeaderText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.muted,
    width: 40,
    textAlign: 'right',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: surfaces.card,
  },
  seed: {
    width: 22,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: palette.muted,
    textAlign: 'center',
    marginRight: 6,
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  teamName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.chalk,
  },
  teamDetail: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.muted,
    marginTop: 1,
  },
  teamCut: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: withAlpha(palette.chalk, 0.55),
    marginTop: 1,
  },
  stat: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: palette.chalk,
    textAlign: 'right',
  },
});
