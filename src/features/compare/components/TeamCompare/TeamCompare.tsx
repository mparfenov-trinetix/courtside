import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSlotsStyle } from '../CompareBar';
import { CompareRow, rowWinner, type Row } from '../CompareRow';
import { Radar, type RadarAxis } from '../Radar';
import { Button, HeadToHead, EmptyState, MINI_CARD_RATIO, MiniCardEmpty, MiniTeamCard, PageSheet, dealIn } from '@/components';
import { useLeagueTeamStats, useSceneSettled, useStandings, useTeamDetail, useTeams, useAppWindow } from '@/hooks';
import type { Team, TeamStatRow } from '@/lib/espn';
import { TEAM_METRICS, conferenceStanding, formatMetric, metricByKey, ordinal, rankOf, type TeamMetric } from '@/lib/league';
import { fonts, matchupColors, palette, teamTheme, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';
import { READABLE } from '@/lib/layout';

function buildRows(rows: TeamStatRow[], a: TeamStatRow, b: TeamStatRow): Row[] {
  const out: Row[] = [];
  for (const m of TEAM_METRICS) {
    out.push({
      label: m.label,
      a: a[m.key],
      b: b[m.key],
      fmt: (v) => formatMetric(m, v),
      lowerBetter: m.lowerBetter,
      aSub: `${ordinal(rankOf(rows, a.teamId, m)!)} in NBA`,
      bSub: `${ordinal(rankOf(rows, b.teamId, m)!)} in NBA`,
    });
  }
  return out;
}

const RADAR: { label: string; key: TeamMetric['key'] }[] = [
  { label: 'Scoring', key: 'ppg' },
  { label: 'Defense', key: 'oppPpg' },
  { label: 'Rebounding', key: 'rpg' },
  { label: 'Passing', key: 'apg' },
  { label: 'Shooting', key: 'efgPct' },
  { label: 'Ball security', key: 'tov' },
];

/** League rank turned into a 0-1 score: best in the league is the outer ring. */
function radarAxes(rows: TeamStatRow[], a: TeamStatRow, b: TeamStatRow): RadarAxis[] {
  const score = (team: TeamStatRow, key: TeamMetric['key']) => (rows.length + 1 - rankOf(rows, team.teamId, metricByKey(key))!) / rows.length;
  return RADAR.map(({ label, key }) => ({ label, a: score(a, key), b: score(b, key) }));
}

/** The two teams picked: the URL holds them so other screens can deep-link a matchup (e.g. a team page's Compare button), the first falling back to your team. */
export function useTeamPicks() {
  const currentTeamId = useScreenTeamStore((s) => s.currentTeamId);
  const { data: teams } = useTeams();
  const { a, b } = useLocalSearchParams<{ a?: string; b?: string }>();
  const idA = a || currentTeamId;
  // Never the same team twice (a link could ask for it).
  const idB = b && b !== idA ? b : null;
  const teamA = teams?.find((t) => t.id === idA);
  const teamB = teams?.find((t) => t.id === idB);
  const fallback = { color: '#8A96A8', alternateColor: '#F2F4F7' };
  const colors = matchupColors(teamA ?? fallback, teamB ?? { color: '#E2B077', alternateColor: '#F2F4F7' });
  return { teams, idA, idB, teamA, teamB, colors };
}

/** Head-to-head season comparison for two teams, with league ranks computed from all 30. `scrollY` is the page's scroll, which the cards follow. */
export function TeamCompare({ scrollY }: { scrollY: SharedValue<number> }) {
  const { teams, idA, idB, teamA, teamB, colors } = useTeamPicks();
  const { data: table, isPending, isError, refetch } = useLeagueTeamStats();
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const { width: screen } = useAppWindow();
  const cardW = Math.floor((screen - 32 - 10) / 2);
  const { data: standings, isLoading: loadingStandings } = useStandings();
  // A team chosen after the screen has settled is dealt in with a flip (not on the screen's own first draw, inside the slide in from the menu).
  const settled = useSceneSettled(0);

  const { data: detailA, isLoading: loadingA } = useTeamDetail(idA);
  const { data: detailB, isLoading: loadingB } = useTeamDetail(idB);
  const statsA = table?.find((r) => r.teamId === idA);
  const statsB = table?.find((r) => r.teamId === idB);
  const slotsStyle = useSlotsStyle(scrollY, Math.round(cardW * MINI_CARD_RATIO));

  const rows = table && statsA && statsB ? buildRows(table, statsA, statsB) : [];
  const winsA = rows.filter((r) => rowWinner(r) === 'a').length;
  const winsB = rows.filter((r) => rowWinner(r) === 'b').length;

  return (
    <>
      {/* The two teams as small team cards (a seat to fill when one is missing), VS between them. */}
      <Animated.View style={[styles.slots, slotsStyle]}>
        <TeamSlot key={teamA?.id ?? 'a'} team={teamA} color={colors.away} width={cardW} record={detailA?.record} standing={short(conferenceStanding(standings, idA))} loading={loadingA || loadingStandings} entering={settled ? dealIn('left') : undefined} onPress={() => setPicking('a')} />
        <TeamSlot key={teamB?.id ?? 'b'} team={teamB} color={colors.home} width={cardW} record={detailB?.record} standing={short(conferenceStanding(standings, idB))} loading={loadingB || loadingStandings} entering={settled ? dealIn('right', 100) : undefined} onPress={() => setPicking('b')} />
        <View pointerEvents="none" style={[styles.vsBadge, { left: screen / 2 - 20, top: Math.round(cardW * MINI_CARD_RATIO) / 2 - 20 }]}>
          <Text style={styles.vsText}>VS</Text>
        </View>
      </Animated.View>

      {rows.length > 0 ? (
        <Animated.View style={styles.card}>
          <Radar axes={radarAxes(table!, statsA!, statsB!)} aColor={colors.away} bColor={colors.home} aName={statsA!.name} bName={statsB!.name} />
          <Text style={styles.radarNote}>Outer ring = best in the league</Text>
          <View style={styles.tally}>
            <Text style={[styles.tallyNum, { color: colors.away }]}>{winsA}</Text>
            <Text style={styles.tallyLabel}>categories won</Text>
            <Text style={[styles.tallyNum, { color: colors.home }]}>{winsB}</Text>
          </View>
          {rows.map((r) => (
            <CompareRow key={r.label} row={r} aColor={colors.away} bColor={colors.home} />
          ))}
        </Animated.View>
      ) : (
        <EmptyState
          title={idA && idB ? (isError ? 'Couldn’t load the stats' : 'Loading stats') : 'Pick two teams'}
          text={idA && idB ? (isError ? 'Check your connection and try again.' : 'Fetching league stats.') : 'Compare scoring, shooting and defense, with where each team ranks in the league.'}
          action={idA && idB ? isError ? <Button label="Try again" onPress={() => void refetch()} style={{ marginTop: 12 }} /> : isPending ? <ActivityIndicator color={palette.muted} style={{ marginTop: 12 }} /> : undefined : undefined}
        />
      )}

      {teamA && teamB && (
        <View style={styles.h2h}>
          <HeadToHead
            a={{ id: teamA.id, abbr: teamA.abbreviation, logo: teamA.logoDark || teamA.logo, color: colors.away }}
            b={{ id: teamB.id, abbr: teamB.abbreviation, logo: teamB.logoDark || teamB.logo, color: colors.home }}
          />
        </View>
      )}

      <TeamPicker
        visible={picking != null}
        teams={teams ?? []}
        disabledId={picking === 'a' ? idB : idA}
        onClose={() => setPicking(null)}
        onPick={(t) => {
          router.setParams(picking === 'a' ? { a: t.id } : { b: t.id });
          setPicking(null);
        }}
      />
    </>
  );
}

/** "7th in the West" -> "7th West": the card has little room. */
const short = (standing?: string) => standing?.replace(' in the ', ' ');

function TeamSlot({ team, color, width, record, standing, loading, entering, onPress }: { team?: Team; color: string; width: number; record?: string; standing?: string; loading: boolean; entering: ComponentProps<typeof MiniTeamCard>['entering']; onPress: () => void }) {
  if (!team) return <MiniCardEmpty width={width} color={color} title="Choose team" hint="Tap to pick" onPress={onPress} />;
  return <MiniTeamCard team={team} theme={teamTheme(team)} width={width} record={record} standing={standing} loading={loading} entering={entering} onPress={onPress} />;
}

function TeamPicker({
  visible,
  teams,
  disabledId,
  onClose,
  onPick,
}: {
  visible: boolean;
  teams: Team[];
  disabledId?: string | null;
  onClose: () => void;
  onPick: (t: Team) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <PageSheet visible={visible} onClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose a team</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[READABLE, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => {
            const disabled = item.id === disabledId;
            return (
              <Pressable accessibilityRole="button"
                disabled={disabled}
                onPress={() => onPick(item)}
                style={({ pressed }) => [
                  styles.result,
                  disabled && { opacity: 0.35 },
                  pressed && { backgroundColor: surfaces.card },
                ]}>
                <Image source={item.logoDark || item.logo} style={styles.resultLogo} contentFit="contain" />
                <Text style={styles.resultName}>{item.displayName}</Text>
                <Text style={styles.resultAbbr}>{item.abbreviation}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </PageSheet>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 8, marginBottom: 16 },
  // Above the cards, which flip in around it: they must never swing over it.
  vsBadge: { position: 'absolute', zIndex: 10, elevation: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.arena, borderWidth: 1.5, borderColor: withAlpha(palette.chalk, 0.5) },
  vsText: { fontFamily: fonts.display, fontSize: 17, color: palette.chalk, letterSpacing: 0.5 },
  card: { marginHorizontal: 16, borderRadius: 22, padding: 16, backgroundColor: surfaces.card },
  h2h: { marginHorizontal: 16, marginBottom: 8 },
  radarNote: { textAlign: 'center', fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginBottom: 14 },
  tally: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tallyNum: { fontFamily: fonts.display, fontSize: 44 },
  tallyLabel: { ...textStyle.sectionLabel },
  modal: { flex: 1, backgroundColor: palette.arena, paddingHorizontal: 16, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
  cancel: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14 },
  resultLogo: { width: 36, height: 36 },
  resultName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  resultAbbr: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
});
