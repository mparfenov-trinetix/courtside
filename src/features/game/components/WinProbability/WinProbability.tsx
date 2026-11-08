import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Line, Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { polylineLength, useDrawIn } from '../../utils';
import type { BoxScoreTeam, Play } from '@/lib/espn';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { HEIGHT, MAX_POINTS } from './constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Point = { p: number; play: Play };

function buildSeries(plays: Play[], winProb: Record<string, number>): Point[] {
  const full: Point[] = [];
  let last = 0.5;
  for (const play of plays) {
    const v = winProb[play.id];
    if (typeof v === 'number') last = v;
    full.push({ p: last, play });
  }
  if (full.length <= MAX_POINTS) return full;
  const step = (full.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => full[Math.round(i * step)]);
}

const periodLabel = (n: number) => (n <= 4 ? `Q${n}` : `OT${n - 4}`);

export function WinProbability({
  plays,
  winProb,
  home,
  away,
  homeColor,
  awayColor,
  selected,
  live,
  titleSlot,
}: {
  plays: Play[];
  winProb: Record<string, number>;
  home: BoxScoreTeam;
  away: BoxScoreTeam;
  homeColor: string;
  awayColor: string;
  selected: number[] | null;
  live: boolean;
  /** Replaces the "Win probability" title, e.g. with a chart switcher. */
  titleSlot?: ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  const series = buildSeries(plays, winProb);
  const count = series.length;
  const cursorX = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  const lastIdx = useSharedValue(-1);

  const gesture = usePanGesture({
    activeOffsetX: [-6, 6],
    failOffsetY: [-14, 14],
    onBegin: (e) => {
      'worklet';
      if (width <= 0 || count < 2) return;
      cursorOpacity.value = withTiming(1, { duration: 120 });
      const x = Math.min(Math.max(e.x, 0), width);
      cursorX.value = x;
      const i = Math.round((x / width) * (count - 1));
      lastIdx.value = i;
      scheduleOnRN(setSel, i);
    },
    onUpdate: (e) => {
      'worklet';
      if (width <= 0 || count < 2) return;
      const x = Math.min(Math.max(e.x, 0), width);
      cursorX.value = x;
      const i = Math.round((x / width) * (count - 1));
      if (i !== lastIdx.value) {
        lastIdx.value = i;
        scheduleOnRN(setSel, i);
      }
    },
    onFinalize: () => {
      'worklet';
      cursorOpacity.value = withTiming(0, { duration: 200 });
      lastIdx.value = -1;
      scheduleOnRN(setSel, null);
    },
  });

  const draw = useDrawIn(width > 0);
  const lineLength = polylineLength(series.map((pt, i) => ({ x: (i / Math.max(1, count - 1)) * width, y: (1 - pt.p) * HEIGHT })));
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: (1 - draw.get()) * lineLength }));
  const fillProps = useAnimatedProps(() => ({ opacity: draw.get() }));

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [{ translateX: cursorX.value }],
  }));

  if (count < 2) return null;

  const xAt = (i: number) => (i / (count - 1)) * width;
  const yAt = (p: number) => (1 - p) * HEIGHT;
  const line = series.map((pt, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(pt.p).toFixed(1)}`).join(' ');
  const mid = HEIGHT / 2;
  const area = `${line} L${width},${mid} L0,${mid} Z`;

  const boundaries: { period: number; x: number }[] = [];
  series.forEach((pt, i) => {
    if (i > 0 && pt.play.period !== series[i - 1].play.period) {
      boundaries.push({ period: pt.play.period, x: xAt(i) });
    }
  });

  let band: { x: number; w: number } | null = null;
  if (selected && selected.length > 0 && width > 0) {
    const first = series.findIndex((pt) => selected.includes(pt.play.period));
    let lastI = -1;
    series.forEach((pt, i) => { if (selected.includes(pt.play.period)) lastI = i; });
    if (first >= 0 && lastI >= 0) band = { x: xAt(first), w: Math.max(2, xAt(lastI) - xAt(first)) };
  }

  const final = series[count - 1].p;
  const shown = sel != null ? series[sel] : null;
  const shownP = shown ? shown.p : final;
  const leader = shownP >= 0.5 ? home : away;
  const leaderPct = Math.round((shownP >= 0.5 ? shownP : 1 - shownP) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {titleSlot ?? <Text style={styles.title}>Win probability</Text>}
        <Text style={styles.readout}>
          {shown
            ? `${periodLabel(shown.play.period)} ${shown.play.clockText} · ${away.team.abbreviation} ${shown.play.awayScore}–${shown.play.homeScore} ${home.team.abbreviation}`
            : 'Drag to scrub'}
        </Text>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          style={styles.chart}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Win probability chart. ${leader.team.displayName} ${leaderPct} percent to win${live ? ', live' : ''}.`}>
          {width > 0 && (
            <>
              <Svg width={width} height={HEIGHT}>
                <Defs>
                  <ClipPath id="top">
                    <Rect x={0} y={0} width={width} height={mid} />
                  </ClipPath>
                  <ClipPath id="bottom">
                    <Rect x={0} y={mid} width={width} height={mid} />
                  </ClipPath>
                </Defs>
                {band && <Rect x={band.x} y={0} width={band.w} height={HEIGHT} fill={withAlpha(palette.chalk, 0.07)} />}
                <AnimatedPath animatedProps={fillProps} d={area} fill={withAlpha(homeColor, 0.5)} clipPath="url(#top)" />
                <AnimatedPath animatedProps={fillProps} d={area} fill={withAlpha(awayColor, 0.5)} clipPath="url(#bottom)" />
                <Line x1={0} y1={mid} x2={width} y2={mid} stroke={withAlpha(palette.chalk, 0.25)} strokeDasharray="3,4" strokeWidth={1} />
                {boundaries.map((b) => (
                  <Line key={b.period} x1={b.x} y1={0} x2={b.x} y2={HEIGHT} stroke={withAlpha(palette.chalk, 0.12)} strokeWidth={1} />
                ))}
                <AnimatedPath
                  animatedProps={lineProps}
                  d={line}
                  stroke={palette.chalk}
                  strokeWidth={1.75}
                  fill="none"
                  strokeLinejoin="round"
                  strokeDasharray={[lineLength, lineLength]}
                />
              </Svg>
              <Animated.View pointerEvents="none" style={[styles.cursor, cursorStyle]} />
              <Text style={[styles.sideLabel, { top: 4, color: homeColor }]}>{home.team.abbreviation}</Text>
              <Text style={[styles.sideLabel, { bottom: 4, color: awayColor }]}>{away.team.abbreviation}</Text>
            </>
          )}
        </View>
      </GestureDetector>

      <View style={styles.periodRow}>
        {[{ period: 1, x: 0 }, ...boundaries].map((b, i, all) => {
          const end = all[i + 1]?.x ?? width;
          return (
            <Text key={b.period} style={[styles.periodLabel, { left: (b.x + end) / 2 - 12 }]}>
              {periodLabel(b.period)}
            </Text>
          );
        })}
      </View>

      <Text style={styles.footer}>
        <Text style={{ color: palette.chalk, fontFamily: fonts.bodyBold }}>{leader.team.abbreviation} {leaderPct}%</Text>
        {shown ? ' at this moment' : completedLabel(final, live)}
      </Text>
    </View>
  );
}

const completedLabel = (final: number, live: boolean) =>
  live ? ' · live' : final >= 0.99 || final <= 0.01 ? ' · final' : ' · latest';

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  title: { ...textStyle.sectionLabel },
  readout: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  chart: {
    height: HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: surfaces.faint,
  },
  cursor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1.5,
    backgroundColor: palette.chalk,
  },
  sideLabel: {
    position: 'absolute',
    left: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  periodRow: { height: 16, marginTop: 6 },
  periodLabel: { position: 'absolute', width: 24, textAlign: 'center', fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  footer: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginTop: 6 },
});
