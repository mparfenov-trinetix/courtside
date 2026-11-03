import { StyleSheet, Text } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { fonts, palette, withAlpha } from '@/lib/theme';

/** One spoke of the chart; `a` and `b` are scores from 0 to 1 (1 = the outer ring). */
export type RadarAxis = { label: string; a: number; b: number };

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Two shapes on shared spokes: wider on a spoke means better there. */
export function Radar({
  axes,
  aColor,
  bColor,
  size = 280,
  aName = 'First',
  bName = 'Second',
}: {
  axes: RadarAxis[];
  aColor: string;
  bColor: string;
  size?: number;
  aName?: string;
  bName?: string;
}) {
  const c = size / 2;
  const R = size / 2 - 44;
  const n = axes.length;
  if (n < 3) return null;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number) => `${(c + Math.cos(angle(i)) * r).toFixed(1)},${(c + Math.sin(angle(i)) * r).toFixed(1)}`;
  const ring = (f: number) => axes.map((_, i) => point(i, R * f)).join(' ');
  const shape = (key: 'a' | 'b') => axes.map((ax, i) => point(i, R * clamp(ax[key]))).join(' ');

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(16).stiffness(140)}
      style={[styles.wrap, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Comparison chart. ${axes
        .map((ax) => `${ax.label}: ${aName} ${Math.round(clamp(ax.a) * 100)} percent, ${bName} ${Math.round(clamp(ax.b) * 100)} percent`)
        .join('. ')}.`}>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <Polygon key={f} points={ring(f)} fill="none" stroke={withAlpha(palette.chalk, f === 1 ? 0.22 : 0.1)} strokeWidth={1} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = point(i, R).split(',');
          return <Line key={i} x1={c} y1={c} x2={Number(x)} y2={Number(y)} stroke={withAlpha(palette.chalk, 0.1)} strokeWidth={1} />;
        })}
        <Polygon points={shape('b')} fill={withAlpha(bColor, 0.28)} stroke={bColor} strokeWidth={2} strokeLinejoin="round" />
        <Polygon points={shape('a')} fill={withAlpha(aColor, 0.28)} stroke={aColor} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={c} cy={c} r={2} fill={withAlpha(palette.chalk, 0.3)} />
      </Svg>
      {axes.map((ax, i) => {
        const x = c + Math.cos(angle(i)) * (R + 24);
        const y = c + Math.sin(angle(i)) * (R + 20);
        return (
          <Text key={ax.label} style={[styles.label, { left: x - 40, top: y - 8 }]}>
            {ax.label}
          </Text>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginBottom: 6 },
  label: { position: 'absolute', width: 80, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.3 },
});
