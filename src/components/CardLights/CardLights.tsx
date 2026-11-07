import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * The light on a tilting card: a thin highlight along each edge that brightens as that edge tips toward the light, and a soft
 * glint in each corner. `x` and `y` are the card's tilt (-1 to 1), `glint` the corner glints' diameter. Put it inside the card's
 * clipped surface, last, so it lies on top.
 */
export function CardLights({ x, y, glint = 150 }: { x: SharedValue<number>; y: SharedValue<number>; glint?: number }) {
  return (
    <>
      <RimLights x={x} y={y} />
      <CornerGlints x={x} y={y} size={glint} />
    </>
  );
}

/** Thin highlights along each edge that brighten as that edge tips toward the light. */
function RimLights({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  const right = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, 1], [0, 0.9], 'clamp') }));
  const left = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-1, 0], [0.9, 0], 'clamp') }));
  const bottom = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 1], [0, 0.9], 'clamp') }));
  const top = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-1, 0], [0.9, 0], 'clamp') }));
  const vertical = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'] as const;

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.rimV, { right: 0 }, right]}>
        <LinearGradient colors={vertical} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.rimV, { left: 0 }, left]}>
        <LinearGradient colors={vertical} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.rimH, { bottom: 0 }, bottom]}>
        <LinearGradient colors={vertical} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.rimH, { top: 0 }, top]}>
        <LinearGradient colors={vertical} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}

/** Soft radial highlights in each corner; the corner you tip toward lights up. */
function CornerGlints({ x, y, size }: { x: SharedValue<number>; y: SharedValue<number>; size: number }) {
  return (
    <>
      <CornerGlint x={x} y={y} size={size} sx={-1} sy={-1} />
      <CornerGlint x={x} y={y} size={size} sx={1} sy={-1} />
      <CornerGlint x={x} y={y} size={size} sx={-1} sy={1} />
      <CornerGlint x={x} y={y} size={size} sx={1} sy={1} />
    </>
  );
}

function CornerGlint({
  x,
  y,
  size,
  sx,
  sy,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  size: number;
  sx: 1 | -1;
  sy: 1 | -1;
}) {
  const style = useAnimatedStyle(() => {
    const amount = Math.max(0, x.value * sx) * 0.6 + Math.max(0, y.value * sy) * 0.6;
    return { opacity: Math.min(1, amount) };
  });
  const id = `${sx}${sy}`;
  const position = {
    [sy < 0 ? 'top' : 'bottom']: -size / 2,
    [sx < 0 ? 'left' : 'right']: -size / 2,
  };
  return (
    <Animated.View pointerEvents="none" style={[styles.glint, { width: size, height: size }, position, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`glint-${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.7} />
            <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#glint-${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rimV: { position: 'absolute', top: 24, bottom: 24, width: 2 },
  rimH: { position: 'absolute', left: 24, right: 24, height: 2 },
  glint: { position: 'absolute' },
});
