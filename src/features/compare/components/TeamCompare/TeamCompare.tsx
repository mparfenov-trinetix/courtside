import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompareRow, rowWinner, type Row } from '../CompareRow';
import { Radar, type RadarAxis } from '../Radar';
import { HeadToHead, EmptyState } from '@/components';
import { useLeagueTeamStats, useTeams } from '@/hooks';
import type { Team, TeamStatRow } from '@/lib/espn';
import { TEAM_METRICS, formatMetric, metricByKey, ordinal, rankOf, type TeamMetric } from '@/lib/league';
import { fonts, matchupColors, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';

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

/** Head-to-head season comparison for two teams, with league ranks computed from all 30. */
export function TeamCompare() {
  const currentTeamId = useScreenTeamStore((s) => s.currentTeamId);
  const { data: teams } = useTeams();
  const { data: table, isPending } = useLeagueTeamStats();
  // The URL holds the two picks so other screens can deep-link a matchup (e.g. a team page's Compare button).
  const { a, b } = useLocalSearchParams<{ a?: string; b?: string }>();
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);

  const idA = a || currentTeamId;
  const idB = b || null;
  const teamA = teams?.find((t) => t.id === idA);
  const teamB = teams?.find((t) => t.id === idB);
  const statsA = table?.find((r) => r.teamId === idA);
  const statsB = table?.find((r) => r.teamId === idB);
  const fallback = { color: '#8A96A8', alternateColor: '#F2F4F7' };
  const colors = matchupColors(teamA ?? fallback, teamB ?? { color: '#E2B077', alternateColor: '#F2F4F7' });

  const rows = table && statsA && statsB ? buildRows(table, statsA, statsB) : [];
  const winsA = rows.filter((r) => rowWinner(r) === 'a').length;
  const winsB = rows.filter((r) => rowWinner(r) === 'b').length;

  return (
    <>
      <View style={styles.slots}>
        <TeamSlot team={teamA} color={colors.away} onPress={() => setPicking('a')} />
        <Text style={styles.vs}>VS</Text>
        <TeamSlot team={teamB} color={colors.home} onPress={() => setPicking('b')} />
      </View>

      {rows.length > 0 ? (
        <Animated.View style={styles.card}>
          <Radar axes={radarAxes(table!, statsA!, statsB!)} aColor={colors.away} bColor={colors.home} aName={statsA!.name} bName={statsB!.name} />
          <Text style={styles.radarNote}>Outer ring = best in the league</Text>
          <View style={styles.tally}>
            <Text style={[styles.tallyNum, { color: colors.away }]}>{winsA}</Text>
            <Text style={styles.tallyLabel}>categories won</Text>
            <Text style={[styles.tallyNum, { color: colors.home }]}>{winsB}</Text>
          </View>
          {rows.map((r, i) => (
            <CompareRow key={r.label} row={r} aColor={colors.away} bColor={colors.home} delay={i * 30} />
          ))}
        </Animated.View>
      ) : (
        <EmptyState
          title={idA && idB ? 'Loading stats' : 'Pick two teams'}
          text={idA && idB ? 'Fetching league stats.' : 'Compare scoring, shooting and defense, with where each team ranks in the league.'}
          action={idA && idB && isPending && <ActivityIndicator color={palette.muted} style={{ marginTop: 12 }} />}
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

function TeamSlot({ team, color, onPress }: { team?: Team; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.slot, { borderColor: withAlpha(color, 0.5) }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.avatar, { backgroundColor: withAlpha(color, 0.3) }]}>
        {team ? (
          <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" />
        ) : (
          <Text style={styles.plus}>+</Text>
        )}
      </View>
      <Text style={styles.slotName} numberOfLines={2}>{team ? team.name : 'Choose team'}</Text>
      <Text style={styles.slotSub}>{team ? team.location : 'Tap to pick'}</Text>
    </Pressable>
  );
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose a team</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => {
            const disabled = item.id === disabledId;
            return (
              <Pressable
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginTop: 8, marginBottom: 16 },
  vs: { fontFamily: fonts.display, fontSize: 20, color: palette.muted },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: surfaces.card,
  },
  avatar: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 64, height: 64 },
  plus: { fontFamily: fonts.display, fontSize: 44, color: palette.chalk },
  slotName: { fontFamily: fonts.displayBold, fontSize: 20, color: palette.chalk, textAlign: 'center', minHeight: 48 },
  slotSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
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
