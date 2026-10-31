import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/components/icons';
import { ErrorState, LoadingState } from '@/components/ui';
import { useGameSummary } from '@/hooks/queries';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

const COLS = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG'] as const;
type Col = typeof COLS[number];

const COL_W: Record<Col, number> = { PTS: 36, REB: 36, AST: 36, STL: 30, BLK: 30, FG: 52 };

function statStyle(col: Col, value?: string): object[] {
  const base = { width: COL_W[col], textAlign: 'right' as const, fontFamily: fonts.bodySemi, fontSize: 13 };
  const highlight = col === 'PTS' && value != null && parseInt(value) >= 20;
  return [base, { color: highlight ? palette.chalk : withAlpha(palette.chalk, 0.75), fontFamily: highlight ? fonts.bodyBold : fonts.bodySemi }];
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useGameSummary(id);
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');

  if (isPending) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingState label="Loading box score" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ErrorState message={error?.message ?? 'Failed to load game'} onRetry={refetch} />
      </View>
    );
  }

  const { home, away, status, completed } = data;
  const team: BoxScoreTeam = activeTeam === 'home' ? home : away;
  const activeCols = COLS.filter((col) => team.columnNames.includes(col));
  const periods = Math.max(home.linescores.length, away.linescores.length);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={14}
        style={styles.backBtn}>
        <ArrowLeftIcon color={palette.chalk} size={20} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Score header */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.scoreHeader}>
          <TeamScore team={away} />
          <View style={styles.scoreCenter}>
            <Text style={styles.vsScore}>
              {completed ? `${away.score}–${home.score}` : 'vs'}
            </Text>
            <Text style={styles.gameStatus}>{status}</Text>
          </View>
          <TeamScore team={home} right />
        </Animated.View>

        {/* Linescore */}
        {periods > 0 && (
          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.linescoreWrap}>
            <View style={styles.linescoreTable}>
              <View style={styles.lsRow}>
                <Text style={[styles.lsCell, styles.lsTeamCell]} />
                {Array.from({ length: periods }, (_, i) => (
                  <Text key={i} style={[styles.lsCell, styles.lsHeaderCell]}>
                    {i < 4 ? `Q${i + 1}` : `OT${i - 3}`}
                  </Text>
                ))}
                <Text style={[styles.lsCell, styles.lsHeaderCell, styles.lsTotalCell]}>F</Text>
              </View>
              {([away, home] as BoxScoreTeam[]).map((t) => (
                <View key={t.team.id} style={[styles.lsRow, styles.lsDataRow]}>
                  <Text style={[styles.lsCell, styles.lsTeamCell, styles.lsTeamName]} numberOfLines={1}>
                    {t.team.abbreviation}
                  </Text>
                  {Array.from({ length: periods }, (_, i) => (
                    <Text key={i} style={styles.lsCell}>
                      {t.linescores[i] != null ? String(t.linescores[i]) : '–'}
                    </Text>
                  ))}
                  <Text style={[styles.lsCell, styles.lsTotalCell, styles.lsFinalScore]}>
                    {t.score}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Team tabs */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.teamTabs}>
          {(['away', 'home'] as const).map((side) => {
            const t = side === 'home' ? home : away;
            const active = activeTeam === side;
            return (
              <Pressable
                key={side}
                onPress={() => setActiveTeam(side)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.teamTab,
                  {
                    backgroundColor: active ? withAlpha(palette.chalk, 0.12) : withAlpha(palette.chalk, pressed ? 0.06 : 0.04),
                    borderColor: active ? withAlpha(palette.chalk, 0.3) : 'transparent',
                  },
                ]}>
                {(t.team.logoDark || t.team.logo) ? (
                  <Image source={t.team.logoDark || t.team.logo} style={styles.tabLogo} contentFit="contain" />
                ) : null}
                <Text style={[styles.tabLabel, { color: active ? palette.chalk : palette.muted }]}>
                  {t.team.abbreviation}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Box score */}
        {activeCols.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(140).duration(300)} style={styles.boxWrap}>
            {/* Header */}
            <View style={styles.boxRow}>
              <Text style={styles.playerCol}>PLAYER</Text>
              {activeCols.map((col) => (
                <Text key={col} style={[{ width: COL_W[col], textAlign: 'right' }, styles.colHeaderText]}>
                  {col}
                </Text>
              ))}
            </View>

            {team.starters.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Starters</Text>
                {team.starters.map((p, i) => (
                  <BoxPlayerRow key={p.id || String(i)} player={p} cols={activeCols} shade={i % 2 === 1} />
                ))}
              </>
            )}

            {team.bench.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Bench</Text>
                {team.bench.map((p, i) => (
                  <BoxPlayerRow key={p.id || String(i)} player={p} cols={activeCols} shade={i % 2 === 1} />
                ))}
              </>
            )}

            {Object.keys(team.totals).length > 0 && (
              <View style={[styles.boxRow, styles.totalsRow]}>
                <Text style={[styles.playerCol, styles.totalsLabel]}>TEAM</Text>
                {activeCols.map((col) => (
                  <Text key={col} style={[{ width: COL_W[col], textAlign: 'right' }, styles.totalsValue]}>
                    {team.totals[col] ?? '–'}
                  </Text>
                ))}
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {completed ? 'Box score unavailable' : 'Available after tip-off'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TeamScore({ team, right }: { team: BoxScoreTeam; right?: boolean }) {
  return (
    <View style={[styles.teamBlock, right && styles.teamBlockRight]}>
      {(team.team.logoDark || team.team.logo) ? (
        <Image source={team.team.logoDark || team.team.logo} style={styles.teamLogo} contentFit="contain" />
      ) : null}
      <Text style={styles.teamAbbr}>{team.team.abbreviation}</Text>
    </View>
  );
}

function BoxPlayerRow({ player, cols, shade }: { player: BoxScorePlayer; cols: Col[]; shade: boolean }) {
  return (
    <View style={[styles.boxRow, shade && styles.shadeRow]}>
      <View style={styles.playerCol}>
        <Text style={styles.playerName} numberOfLines={1}>{player.shortName || player.name}</Text>
        {player.position ? <Text style={styles.playerPos}>{player.position}</Text> : null}
      </View>
      {cols.map((col) => (
        <Text key={col} style={statStyle(col, player.stats[col])}>
          {player.stats[col] ?? '–'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.chalk, 0.08),
    marginTop: 10,
    marginLeft: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  teamBlock: { flex: 1, alignItems: 'flex-start', gap: 6 },
  teamBlockRight: { alignItems: 'flex-end' },
  teamLogo: { width: 52, height: 52 },
  teamAbbr: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  scoreCenter: { alignItems: 'center', gap: 4 },
  vsScore: { fontFamily: fonts.display, fontSize: 32, color: palette.chalk },
  gameStatus: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  linescoreWrap: { paddingHorizontal: 16, marginBottom: 12 },
  linescoreTable: { backgroundColor: withAlpha('#FFFFFF', 0.05), borderRadius: 14, overflow: 'hidden', paddingVertical: 4 },
  lsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  lsDataRow: { paddingVertical: 8 },
  lsCell: { width: 36, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  lsHeaderCell: { color: palette.muted, fontFamily: fonts.body, fontSize: 11 },
  lsTeamCell: { flex: 1, textAlign: 'left' },
  lsTeamName: { fontFamily: fonts.bodyBold, fontSize: 14 },
  lsTotalCell: { fontFamily: fonts.bodyBold },
  lsFinalScore: { fontSize: 15 },
  teamTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  teamTab: { flex: 1, height: 42, borderRadius: 21, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabLogo: { width: 22, height: 22 },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  boxWrap: { paddingHorizontal: 16 },
  groupLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 10, marginBottom: 2, marginLeft: 4 },
  boxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  shadeRow: { backgroundColor: withAlpha('#FFFFFF', 0.03) },
  playerCol: { flex: 1, paddingRight: 6 },
  colHeaderText: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  playerName: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  playerPos: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  totalsRow: { marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), paddingTop: 10 },
  totalsLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  totalsValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
});
