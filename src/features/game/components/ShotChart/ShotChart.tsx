import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line } from 'react-native-svg';

import { CourtMarkings, HeatLayer, Segmented, binShots, COURT_W, COURT_H, HOOP, HOT, COLD } from '@/components';
import type { BoxScorePlayer, BoxScoreTeam, Play } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';


type Shot = { play: Play; x: number; y: number; made: boolean; three: boolean; shooterId: string };
type Zone = 'At rim' | 'Paint' | 'Mid-range' | '3-point';
const ZONES: Zone[] = ['At rim', 'Paint', 'Mid-range', '3-point'];

function zoneOf(s: Shot): Zone {
  if (s.three) return '3-point';
  const dist = Math.hypot(s.x - HOOP.x, s.y - HOOP.y);
  if (dist <= 4.5) return 'At rim';
  if (Math.abs(s.x - HOOP.x) <= 8 && s.y <= 19) return 'Paint';
  return 'Mid-range';
} // feet per heatmap cell

const pct = (m: number, a: number) => (a > 0 ? `${Math.round((m / a) * 100)}%` : '–');

export function ShotChart({
  plays,
  periods,
  away,
  home,
  awayColor,
  homeColor,
}: {
  plays: Play[];
  periods: number[] | null;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  awayColor: string;
  homeColor: string;
}) {
  const [width, setWidth] = useState(0);
  const [side, setSide] = useState<'away' | 'home'>('home');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [showMakes, setShowMakes] = useState(true);
  const [showMisses, setShowMisses] = useState(true);
  const [view, setView] = useState<'shots' | 'heat'>('shots');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const team = side === 'home' ? home : away;
  const color = side === 'home' ? homeColor : awayColor;
  const roster: BoxScorePlayer[] = [...team.starters, ...team.bench];

  const teamShots: Shot[] = plays
    .filter((p) => p.shooting && p.x != null && p.y != null && p.teamId === team.team.id)
    .filter((p) => !/^Free Throw/i.test(p.typeText))
    .filter((p) => (periods ? periods.includes(p.period) : true))
    .filter((p) => (p.y as number) + HOOP.y <= COURT_H)
    .map((p) => ({
      play: p,
      x: Math.min(COURT_W, Math.max(0, p.x as number)),
      // ESPN measures y from the rim (rim at y≈0); our court origin is the baseline
      y: (p.y as number) + HOOP.y,
      made: p.scoreValue > 0,
      three: p.pointsAttempted === 3,
      shooterId: p.athleteIds[0] ?? '',
    }));

  const counts = new Map<string, number>();
  teamShots.forEach((s) => counts.set(s.shooterId, (counts.get(s.shooterId) ?? 0) + 1));
  const shooters = roster
    .filter((p) => (counts.get(p.id) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

  const activeId = playerId && counts.has(playerId) ? playerId : null;
  const shots = activeId ? teamShots.filter((s) => s.shooterId === activeId) : teamShots;
  const visible = shots.filter((s) => (s.made ? showMakes : showMisses));
  const heat = binShots(shots);

  const fgm = shots.filter((s) => s.made).length;
  const tpm = shots.filter((s) => s.made && s.three).length;
  const tpa = shots.filter((s) => s.three).length;

  const scale = width / COURT_W;
  const height = COURT_H * scale;
  const X = (x: number) => x * scale;
  const Y = (y: number) => height - y * scale;

  const zoneStats = ZONES.map((z) => {
    const inZone = shots.filter((s) => zoneOf(s) === z);
    return { zone: z, made: inZone.filter((s) => s.made).length, att: inZone.length };
  });

  const selected = view === 'shots' ? (visible.find((s) => s.play.id === selectedId) ?? null) : null;
  const shooterName = (id: string) => {
    const p = roster.find((r) => r.id === id);
    return p?.shortName || p?.name || 'Unknown';
  };
  const periodLabel = (n: number) => (n <= 4 ? `Q${n}` : `OT${n - 4 > 1 ? n - 4 : ''}`);

  // Tap the court: pick the nearest shot within a thumb's reach, or clear the pick.
  const pickShot = (px: number, py: number) => {
    let best: Shot | null = null;
    let bestDist = 24;
    for (const s of visible) {
      const d = Math.hypot(X(s.x) - px, Y(s.y) - py);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    if (best?.play.id !== selectedId) Haptics.selectionAsync();
    setSelectedId(best ? best.play.id : null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.teamTabs}>
        {(['away', 'home'] as const).map((k) => {
          const t = k === 'home' ? home : away;
          const active = side === k;
          return (
            <Pressable
              key={k}
              onPress={() => { setSide(k); setPlayerId(null); setSelectedId(null); }}
              style={[styles.teamTab, active && { backgroundColor: withAlpha(palette.chalk, 0.12), borderColor: withAlpha(palette.chalk, 0.3) }]}>
              {t.team.logoDark || t.team.logo ? (
                <Image source={t.team.logoDark || t.team.logo} style={styles.tabLogo} contentFit="contain" />
              ) : null}
              <Text style={[styles.teamTabLabel, { color: active ? palette.chalk : palette.muted }]}>{t.team.abbreviation}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.playersScroll}
        contentContainerStyle={styles.players}>
        <PlayerChip label="Team" active={activeId == null} onPress={() => { setPlayerId(null); setSelectedId(null); }} color={color} count={teamShots.length} />
        {shooters.map((p) => (
          <PlayerChip
            key={p.id}
            label={p.shortName || p.name}
            headshot={p.headshot}
            active={activeId === p.id}
            onPress={() => { setPlayerId(p.id); setSelectedId(null); }}
            color={color}
            count={counts.get(p.id) ?? 0}
          />
        ))}
      </ScrollView>

      <View style={styles.summary}>
        <SummaryStat label="FG" value={`${fgm}/${shots.length}`} sub={pct(fgm, shots.length)} />
        <SummaryStat label="3PT" value={`${tpm}/${tpa}`} sub={pct(tpm, tpa)} />
        <SummaryStat
          label="eFG"
          value={shots.length ? `${Math.round(((fgm + 0.5 * tpm) / shots.length) * 100)}%` : '–'}
        />
      </View>

      <View
        style={styles.court}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Shot chart for ${activeId ? 'the selected player' : team.team.displayName}: ${fgm} of ${shots.length} shots made, ${tpm} of ${tpa} from three.`}>
        {width > 0 && (
          <Pressable onPress={(e) => pickShot(e.nativeEvent.locationX, e.nativeEvent.locationY)} disabled={view !== 'shots'}>
          <Svg width={width} height={height}>
            <CourtMarkings width={width} height={height} />

            {view === 'heat' && (
              <HeatLayer key={`${side}-${activeId}-${periods?.join(',') ?? 'all'}`} cells={heat.cells} base={heat.base} scale={scale} height={height} />
            )}

            {view === 'shots' && visible.map((s) => {
              const cx = X(s.x);
              const cy = Y(s.y);
              return s.made ? (
                <Circle key={s.play.id} cx={cx} cy={cy} r={5.5} fill={color} stroke={palette.chalk} strokeWidth={1.25} />
              ) : (
                <G key={s.play.id} opacity={0.75}>
                  <Line x1={cx - 3.5} y1={cy - 3.5} x2={cx + 3.5} y2={cy + 3.5} stroke={withAlpha(palette.chalk, 0.8)} strokeWidth={1.5} strokeLinecap="round" />
                  <Line x1={cx + 3.5} y1={cy - 3.5} x2={cx - 3.5} y2={cy + 3.5} stroke={withAlpha(palette.chalk, 0.8)} strokeWidth={1.5} strokeLinecap="round" />
                </G>
              );
            })}

            {selected && (
              <Circle cx={X(selected.x)} cy={Y(selected.y)} r={11} fill="none" stroke={palette.chalk} strokeWidth={2} />
            )}
          </Svg>
          </Pressable>
        )}

        {selected && width > 0 && (
          <Animated.View
            key={selected.play.id}
            entering={FadeIn.duration(160)}
            pointerEvents="none"
            style={[
              styles.callout,
              {
                left: Math.min(Math.max(X(selected.x) - 95, 6), width - 196),
                top: Y(selected.y) < height * 0.5 ? Y(selected.y) + 18 : Y(selected.y) - 84,
                borderColor: withAlpha(color, 0.6),
              },
            ]}>
            <Text style={styles.calloutName} numberOfLines={1}>
              {shooterName(selected.shooterId)}
            </Text>
            <Text style={[styles.calloutResult, { color: selected.made ? '#34D399' : '#F87171' }]}>
              {selected.made ? 'Made' : 'Missed'} {selected.three ? '3-pointer' : zoneOf(selected) === 'At rim' ? 'layup' : 'jumper'} · {periodLabel(selected.play.period)} {selected.play.clockText}
            </Text>
            <Text style={styles.calloutText} numberOfLines={2}>
              {selected.play.text}
            </Text>
          </Animated.View>
        )}
        {visible.length === 0 && width > 0 && (
          <Animated.Text entering={FadeIn} style={styles.noShots}>No shots with location data</Animated.Text>
        )}
      </View>

      <View style={styles.legend}>
        <Segmented
          options={[
            { key: 'shots', label: 'Shots' },
            { key: 'heat', label: 'Heat' },
          ]}
          value={view}
          onChange={(key) => setView(key)}
          segmentWidth={64}
          compact
        />
        {view === 'shots' ? (
          <View style={styles.legendRight}>
            <Pressable onPress={() => setShowMakes((v) => !v)} style={[styles.legendItem, !showMakes && { opacity: 0.4 }]}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>Made</Text>
            </Pressable>
            <Pressable onPress={() => setShowMisses((v) => !v)} style={[styles.legendItem, !showMisses && { opacity: 0.4 }]}>
              <Text style={styles.legendX}>✕</Text>
              <Text style={styles.legendText}>Missed</Text>
            </Pressable>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={styles.legendRight}>
            <Text style={styles.legendText}>Colder</Text>
            <LinearGradient
              colors={[COLD, withAlpha(palette.chalk, 0.15), HOT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heatBar}
            />
            <Text style={styles.legendText}>Hotter</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>By zone</Text>
      <View style={styles.zoneCard}>
        {zoneStats.map((z, i) => (
          <View key={z.zone} style={[styles.zoneRow, i < zoneStats.length - 1 && styles.zoneBorder]}>
            <Text style={styles.zoneName}>{z.zone}</Text>
            <View style={styles.zoneTrack}>
              <View
                style={[
                  styles.zoneFill,
                  { width: `${shots.length ? (z.att / shots.length) * 100 : 0}%`, backgroundColor: withAlpha(color, 0.5) },
                ]}
              />
            </View>
            <Text style={styles.zoneValue}>{z.made}/{z.att}</Text>
            <Text style={styles.zonePct}>{pct(z.made, z.att)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlayerChip({
  label,
  headshot,
  active,
  onPress,
  color,
  count,
}: {
  label: string;
  headshot?: string;
  active: boolean;
  onPress: () => void;
  color: string;
  count: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: withAlpha(color, 0.25), borderColor: withAlpha(color, 0.7) }]}>
      {headshot ? <Image source={headshot} style={styles.chipImg} contentFit="cover" /> : null}
      <Text style={[styles.chipLabel, active && { color: palette.chalk }]} numberOfLines={1}>{label}</Text>
      <Text style={styles.chipCount}>{count}</Text>
    </Pressable>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
  teamTabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  teamTab: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: withAlpha(palette.chalk, 0.04),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabLogo: { width: 22, height: 22 },
  teamTabLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  // The screen pads its content by 16; cancel that here so the pills scroll to the screen edges.
  playersScroll: { marginHorizontal: -16, flexGrow: 0 },
  players: { gap: 6, paddingBottom: 12, paddingHorizontal: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 10,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: withAlpha(palette.chalk, 0.06),
  },
  chipImg: { width: 24, height: 24, borderRadius: 12, backgroundColor: withAlpha(palette.chalk, 0.1) },
  chipLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted, maxWidth: 96 },
  chipCount: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5 },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: palette.chalk },
  statSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  court: { borderRadius: 14, overflow: 'hidden', minHeight: 120, backgroundColor: withAlpha('#FFFFFF', 0.03) },
  callout: {
    position: 'absolute',
    width: 190,
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(13,27,46,0.94)',
  },
  calloutName: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  calloutResult: { fontFamily: fonts.bodySemi, fontSize: 12 },
  calloutText: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  noShots: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  legendRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heatBar: { width: 72, height: 8, borderRadius: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: palette.chalk },
  legendX: { fontFamily: fonts.bodyBold, fontSize: 12, color: withAlpha(palette.chalk, 0.8) },
  legendText: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  sectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  zoneCard: { borderRadius: 16, backgroundColor: withAlpha('#FFFFFF', 0.05), overflow: 'hidden' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  zoneBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  zoneName: { width: 78, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  zoneTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: withAlpha(palette.chalk, 0.08), overflow: 'hidden' },
  zoneFill: { height: 6, borderRadius: 3 },
  zoneValue: { width: 42, textAlign: 'right', fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  zonePct: { width: 38, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk },
});
