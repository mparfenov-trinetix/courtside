import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Chip } from '@/components';
import type { BoxScoreTeam, Play } from '@/lib/espn';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { PAGE, SKIP } from './constants';

const periodName = (n: number) => (n <= 4 ? `${n}${['st', 'nd', 'rd', 'th'][n - 1]} Quarter` : `Overtime ${n - 4}`);
const periodShort = (n: number) => (n <= 4 ? `Q${n}` : `OT${n - 4}`);

export function PlayByPlay({
  plays,
  periods,
  home,
  away,
  homeColor,
  awayColor,
}: {
  plays: Play[];
  periods: number[] | null;
  home: BoxScoreTeam;
  away: BoxScoreTeam;
  homeColor: string;
  awayColor: string;
}) {
  const [scoringOnly, setScoringOnly] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const teamById = new Map([
    [home.team.id, { team: home, color: homeColor }],
    [away.team.id, { team: away, color: awayColor }],
  ]);

  const filtered = plays
    .filter((p) => (periods ? periods.includes(p.period) : true))
    .filter((p) => (scoringOnly ? p.scoring : true))
    .filter((p) => (showSubs ? true : !SKIP.test(p.typeText)))
    .reverse();

  const visible = filtered.slice(0, limit);

  return (
    <View style={styles.wrap}>
      <View style={styles.filters}>
        <Chip size="md" role="button" label="All plays" active={!scoringOnly} onPress={() => { setScoringOnly(false); setLimit(PAGE); }} />
        <Chip size="md" role="button" label="Scoring" active={scoringOnly} onPress={() => { setScoringOnly(true); setLimit(PAGE); }} />
        <Chip size="md" role="button" label={showSubs ? 'Hide subs' : 'Show subs'} active={showSubs} onPress={() => setShowSubs((v) => !v)} />
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>No plays to show.</Text>
      ) : (
        visible.map((play, i) => {
          const prev = visible[i - 1];
          const entry = play.teamId ? teamById.get(play.teamId) : undefined;
          const isHome = play.teamId === home.team.id;
          const newPeriod = !prev || prev.period !== play.period;
          return (
            <Animated.View key={play.id || String(i)} layout={i < 30 ? LinearTransition.duration(220) : undefined}>
              {newPeriod && <Text style={styles.periodHeader}>{periodName(play.period)}</Text>}
              <Animated.View
                style={[styles.row, play.scoring && { backgroundColor: withAlpha(entry?.color ?? palette.chalk, 0.14) }]}>
                <View style={styles.clock}>
                  <Text style={styles.clockText}>{play.clockText}</Text>
                  <Text style={styles.clockPeriod}>{periodShort(play.period)}</Text>
                </View>
                <View style={styles.logoWrap}>
                  {entry && (entry.team.team.logoDark || entry.team.team.logo) ? (
                    <Image source={entry.team.team.logoDark || entry.team.team.logo} style={styles.logo} contentFit="contain" />
                  ) : (
                    <View style={styles.logoDot} />
                  )}
                </View>
                <Text style={[styles.text, play.scoring && styles.textScoring]} numberOfLines={3}>
                  {play.text.replace(/\s*\n\s*/g, ' ').trim()}
                </Text>
                {play.scoring ? (
                  <View style={styles.score}>
                    <Text style={[styles.scoreNum, !isHome && styles.scoreNumActive]}>{play.awayScore}</Text>
                    <Text style={styles.scoreDash}>–</Text>
                    <Text style={[styles.scoreNum, isHome && styles.scoreNumActive]}>{play.homeScore}</Text>
                  </View>
                ) : null}
              </Animated.View>
            </Animated.View>
          );
        })
      )}

      {filtered.length > limit && (
        <Pressable onPress={() => setLimit((n) => n + PAGE)} style={styles.more}>
          <Text style={styles.moreText}>Show {Math.min(PAGE, filtered.length - limit)} more</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 4 },
  filters: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: palette.muted, textAlign: 'center', paddingVertical: 32 },
  periodHeader: { ...textStyle.sectionLabel, marginTop: 14, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  clock: { width: 44, alignItems: 'flex-start' },
  clockText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  clockPeriod: { fontFamily: fonts.body, fontSize: 10, color: palette.muted },
  logoWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 22, height: 22 },
  logoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(palette.chalk, 0.25) },
  text: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: withAlpha(palette.chalk, 0.75) },
  textScoring: { fontFamily: fonts.bodySemi, color: palette.chalk },
  score: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scoreNum: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  scoreNumActive: { color: palette.chalk, fontFamily: fonts.bodyBold },
  scoreDash: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  more: {
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surfaces.raised,
  },
  moreText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
});
