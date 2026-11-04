import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, G, Line } from 'react-native-svg';

import { CourtMarkings, HeatLayer, Segmented, binShots, COURT_H, COURT_W } from '@/components';
import { usePlayerShots } from '@/hooks';
import type { GameLogEntry } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { SHOT_GAMES } from './constants';

const pct = (m: number, a: number) => (a > 0 ? `${Math.round((m / a) * 100)}%` : '–');

/** Where he has been shooting from over his latest games, as dots or a heat map. Loads only when asked: it reads each game's plays. */
export function PlayerShotChart({ athleteId, log, accent }: { athleteId: string; log: GameLogEntry[]; accent: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'shots' | 'heat'>('shots');
  const [width, setWidth] = useState(0);
  const games = log.slice(0, SHOT_GAMES).map((g) => g.gameId).filter(Boolean);
  const { shots, loaded, total } = usePlayerShots(athleteId, games, open);
  if (games.length === 0) return null;

  const fgm = shots.filter((s) => s.made).length;
  const tpm = shots.filter((s) => s.made && s.three).length;
  const tpa = shots.filter((s) => s.three).length;
  const scale = width / COURT_W;
  const height = COURT_H * scale;
  const done = loaded === total;
  const heat = binShots(shots);

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.wrap}>
      <Text style={styles.title}>Shot chart · last {games.length} games</Text>
      {!open ? (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.closed, pressed && { opacity: 0.8 }]}>
          <Text style={styles.show}>Show shot chart</Text>
          <Text style={styles.note}>Reads the play-by-play of each game, so it takes a moment.</Text>
        </Pressable>
      ) : (
        <View style={styles.card}>
          {!done && (
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${(loaded / total) * 100}%`, backgroundColor: accent }]} />
            </View>
          )}
          <View style={styles.summary}>
            <Stat label="FG" value={`${fgm}/${shots.length}`} sub={pct(fgm, shots.length)} />
            <Stat label="3PT" value={`${tpm}/${tpa}`} sub={pct(tpm, tpa)} />
            <Stat label="eFG" value={shots.length ? `${Math.round(((fgm + 0.5 * tpm) / shots.length) * 100)}%` : '–'} />
          </View>
          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.court}>
            {width > 0 && (
              <Svg width={width} height={height}>
                <CourtMarkings width={width} height={height} />
                {view === 'heat' ? (
                  <HeatLayer key={`${loaded}`} cells={heat.cells} base={heat.base} scale={scale} height={height} />
                ) : (
                  shots.map((s) => {
                    const cx = s.x * scale;
                    const cy = height - s.y * scale;
                    return s.made ? (
                      <Circle key={s.id} cx={cx} cy={cy} r={4.5} fill={accent} stroke={palette.chalk} strokeWidth={1} />
                    ) : (
                      <G key={s.id} opacity={0.7}>
                        <Line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke={withAlpha(palette.chalk, 0.8)} strokeWidth={1.3} strokeLinecap="round" />
                        <Line x1={cx + 3} y1={cy - 3} x2={cx - 3} y2={cy + 3} stroke={withAlpha(palette.chalk, 0.8)} strokeWidth={1.3} strokeLinecap="round" />
                      </G>
                    );
                  })
                )}
              </Svg>
            )}
            {done && shots.length === 0 && <Text style={styles.empty}>No shot locations for these games.</Text>}
          </View>
          <View style={styles.footer}>
            <Segmented
              options={[
                { key: 'shots', label: 'Shots' },
                { key: 'heat', label: 'Heat' },
              ]}
              value={view}
              onChange={(k) => setView(k)}
              segmentWidth={64}
              compact
            />
            <Text style={styles.note}>{done ? 'Regular season and playoffs' : `Loading ${loaded}/${total} games…`}</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  card: { borderRadius: 18, backgroundColor: withAlpha('#FFFFFF', 0.06), padding: 14, gap: 12 },
  closed: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  show: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  note: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  progress: { height: 3, borderRadius: 2, backgroundColor: withAlpha(palette.chalk, 0.1), overflow: 'hidden' },
  progressFill: { height: 3 },
  summary: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5 },
  statValue: { fontFamily: fonts.display, fontSize: 22, color: palette.chalk },
  statSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  court: { borderRadius: 12, overflow: 'hidden', minHeight: 100 },
  empty: { position: 'absolute', alignSelf: 'center', top: '45%', fontFamily: fonts.body, fontSize: 13, color: palette.muted },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
