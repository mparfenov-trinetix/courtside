import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { withAlpha } from '@/lib/theme';

/** Fades a photo's left, right and bottom edges into `color` (the surface behind it). */
export function EdgeFade({ color }: { color: string }) {
  // An eased ramp: a straight one reads as a band.
  const ramp = [withAlpha(color, 0), withAlpha(color, 0.35), withAlpha(color, 0.78), color] as const;
  const stops = [0, 0.4, 0.75, 1] as const;
  return (
    <>
      <LinearGradient pointerEvents="none" colors={[ramp[3], ramp[2], ramp[1], ramp[0]]} locations={[0, 0.25, 0.6, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.side, { left: 0 }]} />
      <LinearGradient pointerEvents="none" colors={ramp} locations={stops} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.side, { right: 0 }]} />
      <LinearGradient pointerEvents="none" colors={ramp} locations={[0, 0.35, 0.65, 0.85]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.bottom} />
    </>
  );
}

const styles = StyleSheet.create({
  side: { position: 'absolute', top: 0, bottom: 0, width: '16%' },
  // A little past the photo's own edge: at a fractional position its last pixel row would otherwise show as a line.
  bottom: { position: 'absolute', left: -1, right: -1, bottom: -2, height: '32%' },
});
