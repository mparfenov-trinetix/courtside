import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ChevronIcon, ListSkeleton } from '@/components';
import { useStandings } from '@/hooks';
import { currentSeason, seasonOfDate, type StandingEntry } from '@/lib/espn';
import { visibleSeeds } from '@/lib/league';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { ROW_H } from './constants';
import { pushOnce } from '@/navigation';

type Side = { id: string; abbr: string; color: string };

const ordinal = (n: number) => {
  const v = n % 100;
  return `${n}${v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/** Opens the Standings screen with both teams lit up (and the right season) so you can see where the game sits. */
function openStandings(teamIds: string[], date?: string) {
  Haptics.selectionAsync();
  // Pushed, not navigated: Standings lives in the menu, and going there would leave the game behind the menu.
  pushOnce({
    pathname: '/matchup-standings' as never,
    params: { teams: teamIds.join(','), ...(date ? { season: String(seasonOfDate(date)) } : {}) },
  });
}

/**
 * Where the two teams stand. In the same conference: that conference's table with both rows lit. In different
 * conferences: a line each with their place. Both end in a link to the full table.
 */
export function MatchupStandings({ away, home, date }: { away: Side; home: Side; date?: string }) {
  const { data, isPending } = useStandings(currentSeason());
  const find = (side: Side) => {
    for (const conf of ['east', 'west'] as const) {
      const row = data?.[conf].find((e) => e.teamId === side.id);
      if (row) return { conf, row };
    }
    return null;
  };
  const a = find(away);
  const h = find(home);

  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>Standings</Text>
      <View style={styles.card}>
        {isPending ? (
          <ListSkeleton count={3} avatar="round" trailing={false} card={false} />
        ) : !a || !h ? (
          <Text style={styles.empty}>Standings aren’t available yet.</Text>
        ) : a.conf === h.conf ? (
          <Table rows={data![a.conf]} lit={{ [away.id]: away.color, [home.id]: home.color }} title={a.conf === 'east' ? 'Eastern Conference' : 'Western Conference'} />
        ) : (
          <View style={styles.pair}>
            <Place side={away} found={a} />
            <View style={styles.divider} />
            <Place side={home} found={h} />
          </View>
        )}
        <Pressable
          onPress={() => openStandings([away.id, home.id], date)}
          accessibilityRole="button"
          accessibilityLabel="Open the full standings"
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}>
          <Text style={styles.linkText}>Full standings</Text>
          <ChevronIcon color={palette.muted} size={14} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** A slim row for games that have started: just the way into the standings, with both teams lit when you get there. */
export function StandingsLink({ away, home, date }: { away: Side; home: Side; date?: string }) {
  return (
    <Pressable
      onPress={() => openStandings([away.id, home.id], date)}
      accessibilityRole="button"
      accessibilityLabel={`Open the standings with ${away.abbr} and ${home.abbr} highlighted`}
      style={({ pressed }) => [styles.slim, pressed && { opacity: 0.7 }]}>
      <Text style={styles.slimText}>
        {away.abbr} and {home.abbr} in the standings
      </Text>
      <ChevronIcon color={palette.muted} size={14} />
    </Pressable>
  );
}

function Table({ rows, lit, title }: { rows: StandingEntry[]; lit: Record<string, string>; title: string }) {
  // Only the part of the table that matters for this game: the two teams and their neighbors.
  const seeds = visibleSeeds(rows.filter((r) => lit[r.teamId]).map((r) => r.seed), rows.length);
  const shown = rows.filter((r) => seeds.includes(r.seed));
  return (
    <View>
      <Text style={styles.conf}>{title}</Text>
      {shown.map((e, i) => {
        const color = lit[e.teamId];
        const skipped = i > 0 && e.seed - shown[i - 1].seed > 1;
        return (
          <View key={e.teamId}>
            {skipped ? <Text style={styles.skip}>···</Text> : null}
            <View style={[styles.row, color ? { backgroundColor: withAlpha(color, 0.22), borderColor: withAlpha(color, 0.85) } : null]}>
            <Text style={styles.seed}>{e.seed}</Text>
            <Image source={e.teamLogo} style={styles.logo} contentFit="contain" />
            <Text style={[styles.abbr, !color && { color: withAlpha(palette.chalk, 0.6) }]}>{e.teamAbbr}</Text>
            <Text style={styles.record}>
              {e.wins}-{e.losses}
            </Text>
            <Text style={styles.gb}>{e.gamesBehind === 0 ? '—' : e.gamesBehind.toFixed(1)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Place({ side, found }: { side: Side; found: { conf: 'east' | 'west'; row: StandingEntry } }) {
  return (
    <View style={styles.place}>
      <Image source={found.row.teamLogo} style={styles.placeLogo} contentFit="contain" />
      <Text style={[styles.placeAbbr, { color: side.color }]}>{side.abbr}</Text>
      <Text style={styles.placeRank}>{ordinal(found.row.seed)}</Text>
      <Text style={styles.placeSub}>
        {found.conf === 'east' ? 'East' : 'West'} · {found.row.wins}-{found.row.losses}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { ...textStyle.sectionLabel, marginBottom: 8, paddingHorizontal: 4 },
  card: { borderRadius: 16, backgroundColor: surfaces.card, padding: 10 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, textAlign: 'center', padding: 14 },
  skip: { textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 14, color: palette.muted, letterSpacing: 2, paddingVertical: 2 },
  conf: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, paddingHorizontal: 8, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: ROW_H,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  seed: { width: 18, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  logo: { width: 22, height: 22 },
  abbr: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  record: { width: 52, textAlign: 'right', fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  gb: { width: 38, textAlign: 'right', fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  pair: { flexDirection: 'row', paddingVertical: 6 },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: withAlpha(palette.chalk, 0.15) },
  place: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
  placeLogo: { width: 36, height: 36 },
  placeAbbr: { fontFamily: fonts.displayBold, fontSize: 20 },
  placeRank: { fontFamily: fonts.display, fontSize: 34, color: palette.chalk },
  placeSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 10, paddingBottom: 4 },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  slim: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: surfaces.card,
  },
  slimText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
});
