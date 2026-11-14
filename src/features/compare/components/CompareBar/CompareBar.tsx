import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { fonts, palette, withAlpha } from '@/lib/theme';
import { useAppWindow } from '@/hooks';

const FACE = 32;
/** The names' font size at full size. */
const NAME_SIZE = 19;

/** One side of the comparison as the compact bar shows it: a face (a player's photo) or a logo (a team's), and a short name. */
export type BarSide = { label: string; image?: string; kind: 'face' | 'logo'; color: string };


/** Where the two cards start in the page's scroll (under the Players / Teams switch). */
const SLOTS_TOP = 66;

// The compact bar comes in as the cards go: from when half of them has scrolled away until nine tenths have.
const startOf = (cardH: number) => SLOTS_TOP + cardH * 0.5;
const endOf = (cardH: number) => SLOTS_TOP + cardH * 0.9;

/** The two cards as the page scrolls: they thin out and shrink a little as the bar takes their place. */
export function useSlotsStyle(scrollY: SharedValue<number>, cardH: number) {
  // Numbers worked out here: a plain function called inside the style would be a call into the JS runtime from the UI thread (it crashes).
  const start = startOf(cardH);
  const end = endOf(cardH);
  return useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [start - 40, end], [1, 0.12], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.get(), [0, end], [1, 0.9], Extrapolation.CLAMP) }],
  }));
}

/**
 * The header's title while comparing: "Compare" until the cards have scrolled away, then the two sides themselves, a small face (or logo) and a
 * name each with VS between, centered on the screen and rising into the header row from below as the cards thin out and the word goes: the page
 * never loses who is being compared (the player page's top bar does the same for one player). It is the `title` node of the `ScreenHeader`, so
 * it lives in the row that says "Compare". Without both sides picked it is just the word.
 */
export function CompareHeaderTitle({ a, b, scrollY, cardH, scale = 1, title = 'Compare' }: { a?: BarSide | null; b?: BarSide | null; scrollY: SharedValue<number>; cardH: number; /** The names' size as a share of full size (see `namesScale`): the same for both. */ scale?: number; title?: string }) {
  const { width: screen } = useAppWindow();
  const start = startOf(cardH);
  const end = endOf(cardH);
  const word = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [start, (start + end) / 2], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.get(), [start, end], [0, -10], Extrapolation.CLAMP) }],
  }));
  const sides = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [(start + end) / 2, end], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.get(), [start, end], [22, 0], Extrapolation.CLAMP) }],
  }));
  if (!a || !b) return <Text style={styles.word}>{title}</Text>;
  return (
    <View style={styles.wrap}>
      <Animated.Text style={[styles.word, styles.layer, word]} numberOfLines={1}>
        {title}
      </Animated.Text>
      {/* As wide as the screen and starting at its left edge (the title sits 76 pt in), so the group is centered on the screen whatever the header's right-hand slot is. */}
      <Animated.View pointerEvents="none" style={[styles.sidesLayer, { width: screen }, sides]}>
        {/* One group, face, name, VS, name, face, each part as wide as it is with the same gap between them all: each avatar right beside its name and the VS
            exactly halfway between the two names, so it moves with them. */}
        <View style={styles.group}>
          <Face side={a} />
          <Text style={[styles.name, { fontSize: NAME_SIZE * scale }]} numberOfLines={1}>
            {a.label}
          </Text>
          <Text style={styles.vs}>VS</Text>
          <Text style={[styles.name, { fontSize: NAME_SIZE * scale }]} numberOfLines={1}>
            {b.label}
          </Text>
          <Face side={b} />
        </View>
      </Animated.View>
    </View>
  );
}

function Face({ side }: { side: BarSide }) {
  return (
    <View style={[styles.face, { backgroundColor: withAlpha(side.color, 0.3), borderColor: withAlpha(side.color, 0.7) }]}>
      {side.image ? <Image source={side.image} style={side.kind === 'face' ? styles.faceImage : styles.logoImage} contentFit={side.kind === 'face' ? 'cover' : 'contain'} contentPosition="top" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Runs on into the header's empty right-hand slot (its 42 pt and the 14 gap).
  wrap: { flex: 1, height: 42, justifyContent: 'center', marginRight: -56 },
  layer: { position: 'absolute', left: 0, right: 0 },
  // The header's own title look.
  word: { fontFamily: fonts.displayBold, fontSize: 24, color: palette.chalk },
  sidesLayer: { position: 'absolute', left: -76, alignItems: 'center' },
  group: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  face: { width: FACE, height: FACE, borderRadius: FACE / 2, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  faceImage: { width: 38, height: 32 },
  logoImage: { width: 24, height: 24 },
  name: { flexShrink: 1, fontFamily: fonts.displayBold, color: palette.chalk },
  vs: { fontFamily: fonts.display, fontSize: 14, color: palette.muted },
});
