import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameInfoCard, GameLeaders, InjuryReport } from '@/components/game/game-leaders';
import { PlayByPlay } from '@/components/game/play-by-play';
import { ShotChart } from '@/components/game/shot-chart';
import { WinProbability } from '@/components/game/win-probability';
import { ArrowLeftIcon } from '@/components/icons';
import { ErrorState, LoadingState } from '@/components/ui';
import { useGameSummary } from '@/hooks/queries';
import { FlashOverlay, Tick } from '@/components/live-flash';
import { useRefresh } from '@/hooks/use-refresh';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import {
  deriveQuarterStats,
  emptyLine,
  lineToStats,
  sumPeriods,
  type Line,
  type QuarterStats,
} from '@/lib/quarter-stats';
import { fonts, matchupColors, palette, withAlpha } from '@/lib/theme';

// ─── Box score column config ───────────────────────────────────────────────────

const COLS = ['MIN', 'PTS', 'REB', 'AST', 'TO', 'STL', 'BLK', '3PT', 'FG', 'FT', 'PF', '+/-'] as const;
type Col = typeof COLS[number];

const COL_W: Record<Col, number> = {
  MIN: 40, PTS: 38, REB: 38, AST: 38, TO: 34, STL: 34, BLK: 34, '3PT': 50, FG: 56, FT: 50, PF: 30, '+/-': 42,
};
const PLAYER_COL_W = 134;
const HEADSHOT_SIZE = 28;

function statStyle(col: Col, value?: string): object[] {
  const base = { width: COL_W[col], textAlign: 'right' as const, fontFamily: fonts.bodySemi, fontSize: 13 };
  const num = value != null ? parseInt(value, 10) : NaN;
  const pts = col === 'PTS' && num >= 20;
  const to = col === 'TO' && num >= 4;
  const pm = col === '+/-' && !isNaN(num) && num !== 0;
  const color = pts
    ? palette.chalk
    : to
      ? '#F87171'
      : pm
        ? num > 0 ? '#34D399' : '#F87171'
        : withAlpha(palette.chalk, 0.75);
  const weight = pts || to ? fonts.bodyBold : fonts.bodySemi;
  return [base, { color, fontFamily: weight }];
}

// ─── Period selection ──────────────────────────────────────────────────────────

type PeriodOption = { key: string; label: string; periods: number[] | null };

const periodLabel = (n: number) => (n <= 4 ? `Q${n}` : `OT${n - 4}`);

function buildPeriodOptions(count: number): PeriodOption[] {
  const opts: PeriodOption[] = [{ key: 'full', label: 'Full', periods: null }];
  for (let n = 1; n <= count; n++) opts.push({ key: `p${n}`, label: periodLabel(n), periods: [n] });
  if (count >= 2) opts.push({ key: 'h1', label: '1H', periods: [1, 2] });
  if (count >= 4) opts.push({ key: 'h2', label: '2H', periods: [3, 4] });
  return opts;
}

// ─── Team stats ────────────────────────────────────────────────────────────────

type TeamNums = {
  pts: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number;
  reb: number; ast: number; to: number; stl: number; blk: number; pf: number;
};

function parseMadeAtt(val?: string): [number, number] {
  if (!val) return [0, 0];
  const [m, a] = val.split('-').map(Number);
  return [isNaN(m) ? 0 : m, isNaN(a) ? 0 : a];
}

function numsFromTotals(t: Record<string, string>): TeamNums | null {
  if (!t['PTS'] && !t['FG']) return null;
  const n = (k: string) => {
    const v = Number(t[k]);
    return isNaN(v) ? 0 : v;
  };
  const [fgm, fga] = parseMadeAtt(t['FG']);
  const [tpm, tpa] = parseMadeAtt(t['3PT']);
  const [ftm, fta] = parseMadeAtt(t['FT']);
  return {
    pts: n('PTS'), fgm, fga, tpm, tpa, ftm, fta,
    reb: n('REB'), ast: n('AST'), to: n('TO'), stl: n('STL'), blk: n('BLK'), pf: n('PF'),
  };
}

function numsFromLine(l: Line): TeamNums {
  return {
    pts: l.pts, fgm: l.fgm, fga: l.fga, tpm: l.tpm, tpa: l.tpa, ftm: l.ftm, fta: l.fta,
    reb: l.oreb + l.dreb, ast: l.ast, to: l.to, stl: l.stl, blk: l.blk, pf: l.pf,
  };
}

type StatBarConfig = {
  label: string;
  away: number;
  home: number;
  awayText: string;
  homeText: string;
  awaySub?: string;
  homeSub?: string;
  lowerIsBetter?: boolean;
};

function buildTeamStats(a: TeamNums, h: TeamNums): StatBarConfig[] {
  const int = (label: string, av: number, hv: number, lowerIsBetter?: boolean): StatBarConfig => ({
    label, away: av, home: hv, awayText: String(av), homeText: String(hv), lowerIsBetter,
  });
  const pct = (label: string, am: number, aa: number, hm: number, ha: number): StatBarConfig => ({
    label,
    away: aa > 0 ? am / aa : 0,
    home: ha > 0 ? hm / ha : 0,
    awayText: aa > 0 ? `${Math.round((am / aa) * 100)}%` : '–',
    homeText: ha > 0 ? `${Math.round((hm / ha) * 100)}%` : '–',
    awaySub: aa > 0 ? `${am}/${aa}` : undefined,
    homeSub: ha > 0 ? `${hm}/${ha}` : undefined,
  });
  return [
    int('Points', a.pts, h.pts),
    pct('Field goals', a.fgm, a.fga, h.fgm, h.fga),
    pct('3-pointers', a.tpm, a.tpa, h.tpm, h.tpa),
    pct('Free throws', a.ftm, a.fta, h.ftm, h.fta),
    int('Rebounds', a.reb, h.reb),
    int('Assists', a.ast, h.ast),
    int('Turnovers', a.to, h.to, true),
    int('Steals', a.stl, h.stl),
    int('Blocks', a.blk, h.blk),
    int('Fouls', a.pf, h.pf, true),
  ];
}

// ─── Sorting ───────────────────────────────────────────────────────────────────

type SortDir = 'desc' | 'asc';

function parseStatNum(val?: string): number {
  if (!val || val === '–') return -Infinity;
  // "8-18" sorts by makes, "+5" / "-3" by signed value
  const m = /^[+-]?\d+(\.\d+)?/.exec(val.trim());
  return m ? parseFloat(m[0]) : -Infinity;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type MainTab = 'stats' | 'plays' | 'shots';

function playersWithStats(team: BoxScoreTeam, derived: QuarterStats | null, periods: number[] | null): BoxScorePlayer[] {
  const all = [...team.starters, ...team.bench];
  if (!periods || !derived) return all;
  return all
    .map((p) => {
      const line = sumPeriods(derived.players, periods, p.id);
      return { player: p, line };
    })
    .filter(({ line }) => line.sec > 0)
    .map(({ player, line }) => ({ ...player, stats: lineToStats(line) }));
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useGameSummary(id);
  const refreshControl = useRefresh([['game', id]]);
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [tab, setTab] = useState<MainTab>('stats');
  const [periodKey, setPeriodKey] = useState('full');
  const [sortCol, setSortCol] = useState<Col | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (col: Col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  if (isPending) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingState label="Loading game" />
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

  const { home, away, status, completed, live, plays, winProb, info } = data;
  const { home: homeColor, away: awayColor } = matchupColors(away.team, home.team);
  const hasStarted = completed || live || plays.length > 0;

  const derived: QuarterStats | null =
    plays.length > 0
      ? deriveQuarterStats(
          plays,
          [
            { teamId: away.team.id, starterIds: away.starters.map((p) => p.id) },
            { teamId: home.team.id, starterIds: home.starters.map((p) => p.id) },
          ],
          home.team.id,
        )
      : null;

  const periodCount = Math.max(home.linescores.length, away.linescores.length, derived?.periods.length ?? 0);
  const options = buildPeriodOptions(derived ? periodCount : 0);
  const option = options.find((o) => o.key === periodKey) ?? options[0];
  const selPeriods = option.periods;
  const filtered = selPeriods != null;

  const team: BoxScoreTeam = activeTeam === 'home' ? home : away;
  const teamColor = activeTeam === 'home' ? homeColor : awayColor;

  const awayPlayers = playersWithStats(away, derived, selPeriods);
  const homePlayers = playersWithStats(home, derived, selPeriods);
  const teamPlayers = activeTeam === 'home' ? homePlayers : awayPlayers;

  const activeCols: Col[] = filtered ? [...COLS] : COLS.filter((col) => team.columnNames.includes(col));
  const effectiveSort: Col | null = sortCol ?? (filtered ? 'MIN' : null);
  const effectiveDir: SortDir = sortCol ? sortDir : 'desc';

  const sumLine = (teamId: string): Line =>
    derived && selPeriods ? sumPeriods(derived.teams, selPeriods, teamId) : emptyLine();

  const awayNums = filtered ? numsFromLine(sumLine(away.team.id)) : numsFromTotals(away.totals);
  const homeNums = filtered ? numsFromLine(sumLine(home.team.id)) : numsFromTotals(home.totals);
  const teamStats = awayNums && homeNums && hasStarted ? buildTeamStats(awayNums, homeNums) : [];

  const totalsStats: Record<string, string> = filtered
    ? (() => {
        const l = sumLine(team.team.id);
        const mins = teamPlayers.reduce(
          (acc, p) => acc + (derived && selPeriods ? sumPeriods(derived.players, selPeriods, p.id).sec : 0),
          0,
        );
        return { ...lineToStats(l), MIN: String(Math.round(mins / 60)), '+/-': '–' };
      })()
    : team.totals;

  const qScore = (t: BoxScoreTeam) =>
    selPeriods ? selPeriods.reduce((acc, n) => acc + (t.linescores[n - 1] ?? 0), 0) : t.score;

  const sortedPlayers = effectiveSort
    ? [...teamPlayers].sort((a, b) => {
        const av = parseStatNum(a.stats[effectiveSort]);
        const bv = parseStatNum(b.stats[effectiveSort]);
        return effectiveDir === 'desc' ? bv - av : av - bv;
      })
    : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(awayColor, 0.34), withAlpha(homeColor, 0.34)]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 0.6 }}
        style={styles.heroTint}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(13,27,46,0)', palette.arena]}
        style={styles.heroTint}
      />

      <View style={{ paddingTop: insets.top }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={14}
          style={styles.backBtn}>
          <ArrowLeftIcon color={palette.chalk} size={20} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Score header */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.scoreHeader}>
          <TeamScore team={away} />
          <View style={styles.scoreCenter}>
            <Tick style={styles.vsScore} value={hasStarted ? `${away.score}–${home.score}` : 'vs'} />
            {live ? <LivePill label={status} /> : <Text style={styles.gameStatus}>{status}</Text>}
          </View>
          <TeamScore team={home} right />
        </Animated.View>

        {/* Linescore */}
        {periodCount > 0 && (
          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.linescoreWrap}>
            <View style={styles.linescoreTable}>
              <View style={styles.lsRow}>
                <Text style={[styles.lsCell, styles.lsTeamCell]} />
                {Array.from({ length: periodCount }, (_, i) => (
                  <Text key={i} style={[styles.lsCell, styles.lsHeaderCell, selPeriods?.includes(i + 1) && styles.lsActiveHeader]}>
                    {periodLabel(i + 1)}
                  </Text>
                ))}
                <Text style={[styles.lsCell, styles.lsHeaderCell, styles.lsTotalCell, !filtered && styles.lsActiveHeader]}>{completed ? 'F' : 'T'}</Text>
              </View>
              {([away, home] as BoxScoreTeam[]).map((t) => (
                <View key={t.team.id} style={[styles.lsRow, styles.lsDataRow]}>
                  <Text style={[styles.lsCell, styles.lsTeamCell, styles.lsTeamName]} numberOfLines={1}>
                    {t.team.abbreviation}
                  </Text>
                  {Array.from({ length: periodCount }, (_, i) => (
                    <Tick
                      key={i}
                      style={[styles.lsCell, selPeriods?.includes(i + 1) && styles.lsActiveVal]}
                      value={t.linescores[i] != null ? String(t.linescores[i]) : '–'}
                    />
                  ))}
                  <Tick
                    style={[styles.lsCell, styles.lsTotalCell, styles.lsFinalScore, !filtered && styles.lsActiveVal]}
                    value={t.score}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Win probability */}
        {plays.length > 1 && Object.keys(winProb).length > 0 && (
          <Animated.View entering={FadeInDown.delay(90).duration(300)}>
            <WinProbability
              plays={plays}
              winProb={winProb}
              home={home}
              away={away}
              homeColor={homeColor}
              awayColor={awayColor}
              selected={selPeriods}
              live={live}
            />
          </Animated.View>
        )}

        {/* Period selector */}
        {options.length > 1 && (
          <Animated.View entering={FadeInDown.delay(110).duration(300)} style={styles.periodWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.qTabs}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
              {options.map((o) => {
                const active = o.key === option.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPeriodKey(o.key);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={[styles.qTab, active && styles.qTabActive]}>
                    <Text style={[styles.qTabLabel, active && styles.qTabLabelActive]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filtered && (
              <View style={styles.qScoreRow}>
                <Text style={styles.qScoreTeam}>{away.team.abbreviation}</Text>
                <Text style={styles.qScore}>{qScore(away)}</Text>
                <Text style={styles.qScoreDash}>–</Text>
                <Text style={styles.qScore}>{qScore(home)}</Text>
                <Text style={styles.qScoreTeam}>{home.team.abbreviation}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Stats | Plays */}
        {hasStarted && plays.length > 0 && (
          <View style={styles.mainTabs}>
            {(['stats', 'plays', 'shots'] as const).map((k) => {
              const active = tab === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTab(k);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.mainTab, active && { borderBottomColor: teamColor }]}>
                  <Text style={[styles.mainTabLabel, active && { color: palette.chalk }]}>
                    {k === 'stats' ? 'Stats' : k === 'plays' ? 'Play-by-play' : 'Shots'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {tab === 'shots' && plays.length > 0 ? (
          <ShotChart
            plays={plays}
            periods={selPeriods}
            away={away}
            home={home}
            awayColor={awayColor}
            homeColor={homeColor}
          />
        ) : tab === 'plays' && plays.length > 0 ? (
          <PlayByPlay
            key={option.key}
            plays={plays}
            periods={selPeriods}
            home={home}
            away={away}
            homeColor={homeColor}
            awayColor={awayColor}
          />
        ) : (
          <>
            {/* Leaders */}
            {hasStarted && (
              <Animated.View entering={FadeInDown.delay(120).duration(300)}>
                <GameLeaders
                  away={{ teamId: away.team.id, abbr: away.team.abbreviation, color: awayColor, players: awayPlayers }}
                  home={{ teamId: home.team.id, abbr: home.team.abbreviation, color: homeColor, players: homePlayers }}
                />
              </Animated.View>
            )}

            {/* Team stats */}
            {teamStats.length > 0 && (
              <Animated.View entering={FadeInDown.delay(130).duration(300)} style={styles.statsSection}>
                <View style={styles.statsHeaderRow}>
                  <Text style={styles.statsSectionTitle}>Team stats</Text>
                  {filtered && <Text style={styles.derivedNote}>{option.label} · from play-by-play</Text>}
                </View>
                <View style={styles.teamKey}>
                  <Text style={[styles.teamKeyLabel, { color: awayColor }]}>{away.team.abbreviation}</Text>
                  <Text style={[styles.teamKeyLabel, { color: homeColor }]}>{home.team.abbreviation}</Text>
                </View>
                {teamStats.map((s) => (
                  <TeamStatBar key={s.label} {...s} awayColor={awayColor} homeColor={homeColor} />
                ))}
              </Animated.View>
            )}

            {/* Team tabs */}
            {hasStarted && (
              <Animated.View entering={FadeInDown.delay(140).duration(300)} style={styles.teamTabs}>
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
            )}

            {/* Box score */}
            {hasStarted && activeCols.length > 0 && teamPlayers.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.boxWrap}>
                <Text style={styles.boxNote}>
                  {filtered
                    ? `${option.label} player stats rebuilt from play-by-play · tap a column to sort`
                    : 'Tap a column header to sort'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
                  <View>
                    <View style={styles.boxRow}>
                      <View style={[styles.playerColFixed, styles.headerPlayerCol]}>
                        <Text style={styles.playerColHeader}>PLAYER</Text>
                      </View>
                      {activeCols.map((col) => {
                        const active = effectiveSort === col;
                        return (
                          <Pressable
                            key={col}
                            onPress={() => handleSort(col)}
                            style={{ width: COL_W[col], alignItems: 'flex-end' }}>
                            <Text style={[styles.colHeaderText, active && styles.colHeaderActive]}>
                              {col}{active ? (effectiveDir === 'desc' ? ' ▾' : ' ▴') : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {sortedPlayers ? (
                      sortedPlayers.map((p, i) => (
                        <BoxPlayerRow key={p.id || String(i)} player={p} cols={activeCols} shade={i % 2 === 1} teamId={team.team.id} />
                      ))
                    ) : (
                      <>
                        {team.starters.length > 0 && (
                          <>
                            <Text style={styles.groupLabel}>Starters</Text>
                            {team.starters.map((p, i) => (
                              <BoxPlayerRow key={p.id || String(i)} player={p} cols={activeCols} shade={i % 2 === 1} teamId={team.team.id} />
                            ))}
                          </>
                        )}
                        {team.bench.length > 0 && (
                          <>
                            <Text style={styles.groupLabel}>Bench</Text>
                            {team.bench.map((p, i) => (
                              <BoxPlayerRow key={p.id || String(i)} player={p} cols={activeCols} shade={i % 2 === 1} teamId={team.team.id} />
                            ))}
                          </>
                        )}
                      </>
                    )}

                    {Object.keys(totalsStats).length > 0 && (
                      <View style={[styles.boxRow, styles.totalsRow]}>
                        <View style={styles.playerColFixed}>
                          <Text style={styles.totalsLabel}>TEAM</Text>
                        </View>
                        {activeCols.map((col) => (
                          <Text key={col} style={[{ width: COL_W[col], textAlign: 'right' as const }, styles.totalsValue]}>
                            {totalsStats[col] || '–'}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </ScrollView>
              </Animated.View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {hasStarted ? 'No player stats for this period' : 'Available after tip-off'}
                </Text>
              </View>
            )}

            <InjuryReport
              injuries={info.injuries}
              teams={[
                { id: away.team.id, abbr: away.team.abbreviation, color: awayColor },
                { id: home.team.id, abbr: home.team.abbreviation, color: homeColor },
              ]}
            />
            <GameInfoCard info={info} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LivePill({ label }: { label: string }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, [pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={styles.livePill}>
      <Animated.View style={[styles.liveDot, dot]} />
      <Tick style={styles.liveText} value={label || 'Live'} />
    </View>
  );
}

function TeamStatBar({
  label,
  away,
  home,
  awayText,
  homeText,
  awaySub,
  homeSub,
  lowerIsBetter,
  awayColor,
  homeColor,
}: StatBarConfig & { awayColor: string; homeColor: string }) {
  const total = away + home;
  const awayFrac = total > 0 ? away / total : 0.5;
  const awayWins = lowerIsBetter ? away < home : away > home;
  const homeWins = lowerIsBetter ? home < away : home > away;
  const tie = away === home;
  const hi = withAlpha(palette.chalk, 0.95);
  const lo = withAlpha(palette.chalk, 0.5);

  return (
    <View style={styles.statBar}>
      <View style={styles.statBarRow}>
        <View style={styles.statBarSide}>
          <Text style={[styles.statBarVal, { color: awayWins || tie ? hi : lo }]}>{awayText}</Text>
          {awaySub ? <Text style={styles.statBarSub}>{awaySub}</Text> : null}
        </View>
        <Text style={styles.statBarLabel}>{label}</Text>
        <View style={[styles.statBarSide, { alignItems: 'flex-end' }]}>
          <Text style={[styles.statBarVal, { color: homeWins || tie ? hi : lo }]}>{homeText}</Text>
          {homeSub ? <Text style={styles.statBarSub}>{homeSub}</Text> : null}
        </View>
      </View>
      <View style={styles.statBarTrack}>
        <View
          style={[
            styles.statBarFill,
            styles.statBarAway,
            { flex: awayFrac, backgroundColor: awayColor, opacity: awayWins || tie ? 1 : 0.35 },
          ]}
        />
        <View
          style={[
            styles.statBarFill,
            styles.statBarHome,
            { flex: 1 - awayFrac, backgroundColor: homeColor, opacity: homeWins || tie ? 1 : 0.35 },
          ]}
        />
      </View>
    </View>
  );
}

function TeamScore({ team, right }: { team: BoxScoreTeam; right?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/team/${team.team.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${team.team.abbreviation}`}
      style={({ pressed }) => [styles.teamBlock, right && styles.teamBlockRight, pressed && { opacity: 0.7 }]}>
      {(team.team.logoDark || team.team.logo) ? (
        <Image source={team.team.logoDark || team.team.logo} style={styles.teamLogo} contentFit="contain" />
      ) : null}
      <Text style={styles.teamAbbr}>{team.team.abbreviation}</Text>
    </Pressable>
  );
}

function BoxPlayerRow({
  player,
  cols,
  shade,
  teamId,
}: {
  player: BoxScorePlayer;
  cols: Col[];
  shade: boolean;
  teamId: string;
}) {
  const canNavigate = !!player.id;
  return (
    <Pressable
      onPress={() => canNavigate && router.push({ pathname: '/player/[id]', params: { id: player.id, teamId } })}
      accessibilityRole={canNavigate ? 'button' : 'none'}
      style={({ pressed }) => [styles.boxRow, shade && styles.shadeRow, pressed && canNavigate && { opacity: 0.7 }]}>
      <FlashOverlay radius={8} signature={cols.map((c) => player.stats[c] ?? '').join('|')} />
      <View style={styles.playerColFixed}>
        {player.headshot ? (
          <Image source={player.headshot} style={styles.playerHeadshot} contentFit="cover" />
        ) : (
          <View style={[styles.playerHeadshot, styles.playerHeadshotPlaceholder]}>
            <Text style={styles.playerInitials}>
              {(player.shortName || player.name).charAt(0)}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.playerName} numberOfLines={1}>{player.shortName || player.name}</Text>
          {player.position ? <Text style={styles.playerPos}>{player.position}</Text> : null}
        </View>
      </View>
      {cols.map((col) => (
        <Text key={col} style={statStyle(col, player.stats[col])}>
          {player.stats[col] ?? '–'}
        </Text>
      ))}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  heroTint: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
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

  // Score header
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
  gameStatus: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: palette.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Linescore
  linescoreWrap: { paddingHorizontal: 16, marginBottom: 14 },
  linescoreTable: {
    backgroundColor: withAlpha('#FFFFFF', 0.05),
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  lsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  lsDataRow: { paddingVertical: 8 },
  lsCell: { width: 36, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  lsHeaderCell: { color: palette.muted, fontFamily: fonts.body, fontSize: 11 },
  lsTeamCell: { flex: 1, textAlign: 'left' },
  lsTeamName: { fontFamily: fonts.bodyBold, fontSize: 14 },
  lsTotalCell: { fontFamily: fonts.bodyBold },
  lsFinalScore: { fontSize: 15 },
  lsActiveHeader: { color: palette.chalk, fontFamily: fonts.bodyBold },
  lsActiveVal: { color: palette.chalk, fontFamily: fonts.bodyBold },

  // Quarter tabs
  periodWrap: { marginBottom: 6 },
  qTabs: { marginBottom: 2 },
  qTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: withAlpha(palette.chalk, 0.06),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  qTabActive: {
    backgroundColor: withAlpha(palette.chalk, 0.14),
    borderColor: withAlpha(palette.chalk, 0.28),
  },
  qTabLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  qTabLabelActive: { color: palette.chalk },

  // Q mini-score
  qScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 6,
    gap: 8,
  },
  qScoreTeam: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted, width: 40, textAlign: 'center' },
  qScore: { fontFamily: fonts.display, fontSize: 36, color: palette.chalk },
  qScoreDash: { fontFamily: fonts.body, fontSize: 20, color: palette.muted },

  // Team stats
  statsSection: { paddingHorizontal: 16, marginBottom: 14 },
  statsSectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statBar: { marginBottom: 10 },
  statBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statBarSide: { width: 64, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  statBarVal: { fontFamily: fonts.bodyBold, fontSize: 15 },
  statBarSub: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  statBarLabel: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.muted, textAlign: 'center' },
  statBarTrack: { height: 5, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', gap: 2 },
  statBarFill: { height: 5 },
  statBarAway: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  statBarHome: { borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  statsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  derivedNote: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  teamKey: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  teamKeyLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5 },

  // Main tabs
  mainTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha(palette.chalk, 0.1),
  },
  mainTab: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mainTabLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted },

  // Live pill
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: withAlpha('#F87171', 0.16),
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F87171' },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#F87171', letterSpacing: 0.4 },

  // Team tabs
  teamTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  teamTab: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabLogo: { width: 22, height: 22 },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },

  // Box score
  boxWrap: {},
  boxNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.muted,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  groupLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: palette.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
    paddingLeft: 4,
  },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingRight: 16,
    borderRadius: 8,
  },
  shadeRow: { backgroundColor: withAlpha('#FFFFFF', 0.03) },
  headerPlayerCol: { justifyContent: 'flex-start' },
  playerColFixed: {
    width: PLAYER_COL_W,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 6,
  },
  playerColHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: withAlpha(palette.chalk, 0.8),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  colHeaderText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: palette.muted,
    letterSpacing: 0.4,
  },
  colHeaderActive: {
    color: palette.chalk,
    fontFamily: fonts.bodyBold,
  },
  playerHeadshot: {
    width: HEADSHOT_SIZE,
    height: HEADSHOT_SIZE,
    borderRadius: HEADSHOT_SIZE / 2,
    overflow: 'hidden',
  },
  playerHeadshotPlaceholder: {
    backgroundColor: withAlpha(palette.chalk, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInitials: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  playerName: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  playerPos: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  totalsRow: {
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: withAlpha(palette.chalk, 0.12),
    paddingTop: 10,
  },
  totalsLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  totalsValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk },

  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
});
