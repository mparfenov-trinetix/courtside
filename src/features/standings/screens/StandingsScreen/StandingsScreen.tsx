import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Segmented, ErrorState, ListSkeleton, ScreenHeader , SeasonButton, SeasonSheet } from '@/components';
import { useRefresh, useStandings, useTeams } from '@/hooks';
import { currentSeason, teamInSeason, type StandingEntry } from '@/lib/espn';
import { hasPlayIn } from '@/lib/league';
import { fonts, matchupColors, palette, teamTheme, withAlpha, surfaces } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { goBack, openDetail, sharedTag, teamHref } from '@/navigation';

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
  // The nickname each row shows: the team's name in that season (SuperSonics for 2005-06), the code when the list has not arrived.
  const nameOf = (entry: StandingEntry) => teamInSeason(teams?.find((t) => t.id === entry.teamId), season)?.name || entry.teamAbbr || entry.teamName;
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

  const flat: (StandingEntry | { sectionTitle: string })[] = isLeague
    ? entries
    : sections.flatMap((s) => [{ sectionTitle: s.title }, ...s.data]);

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
            return <TeamRow entry={item} season={season} name={nameOf(item)} highlight={colors[item.teamId]} />;
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

function TeamRow({ entry, season, name, highlight }: { entry: StandingEntry; season: number; name: string; highlight?: string }) {
  const favoriteTeamId = useTeamStore((s) => s.favoriteTeamId);
  const gbText = entry.gamesBehind === 0 ? '—' : entry.gamesBehind.toFixed(1);
  const pctText = entry.winPct.toFixed(3).replace(/^0/, '');
  const streakColor = entry.streak.startsWith('W') ? palette.win : entry.streak.startsWith('L') ? palette.loss : palette.muted;

  return (
    // No entrance per row: thirty animated views built in the frames of the drawer's own slide-in (and again at every conference or season switch).
    <View>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          // A past season in which the team went by another name opens that name's card (the SuperSonics of 2005-06).
          const era = teamHref(entry.teamId, season);
          openDetail(typeof era === 'string' && era.includes('season=') ? era : { pathname: '/team/[id]', params: { id: entry.teamId, o: 'standings' } });
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
          {/* The nickname, as the team was called that season; the longest (Timberwolves, Trail Blazers) shrink a little to fit the row. */}
          <Text style={styles.teamName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {name}
            {entry.teamId === favoriteTeamId ? '  ★' : ''}
          </Text>
        </View>
        <Text style={[styles.stat, { width: COL.w }]}>{entry.wins}</Text>
        <Text style={[styles.stat, { width: COL.l }]}>{entry.losses}</Text>
        <Text style={[styles.stat, { width: COL.pct }]}>{pctText}</Text>
        <Text style={[styles.stat, { width: COL.gb, color: palette.muted }]}>{gbText}</Text>
        <Text style={[styles.stat, { width: COL.strk, color: streakColor, fontFamily: fonts.bodyBold }]}>{entry.streak || '–'}</Text>
      </Pressable>
    </View>
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
  stat: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: palette.chalk,
    textAlign: 'right',
  },
});
