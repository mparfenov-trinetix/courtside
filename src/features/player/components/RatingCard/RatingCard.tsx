import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  measure,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTilt, useAppWindow } from '@/hooks';
import { NBA2K_TOP_COUNT, type Nba2kRating } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { COUNT_DELAY_MS, COUNT_MS, CARD_HEIGHT, MAX_ROTATE, RADIUS, tintFor } from './constants';

// 2K's own NBA 2K27 logo, from nba.2k.com (a practice app; not for distribution).
const LOGO = require('@/assets/images/nba-2k27-logo.png');

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/**
 * The player's NBA 2K27 overall, as 2K published it: only for the Top 100, the only ratings 2K makes public. A trading card:
 * it tilts under a finger or the phone (like the team and player cards), a band of light follows the tilt, the logo floats a
 * little above the surface, and when it scrolls into view it flips in and the overall counts up (once). `scrollY` is the page's
 * scroll offset: the card sits below the fold, so it waits to be seen.
 */
export function RatingCard({ rating, scrollY }: { rating: Nba2kRating; scrollY: SharedValue<number> }) {
  const tint = tintFor(rating.overall);
  const { width: screen } = useAppWindow();
  const width = screen - 32;
  const tilt = useTilt({ width, height: CARD_HEIGHT }, { scrollSafe: true });
  const { x, y } = tilt;

  // The reveal: 0 until the card is on screen, then 1. The count and the glint start with it.
  const { height: windowHeight } = useAppWindow();
  const ref = useAnimatedRef<Animated.View>();
  const reveal = useSharedValue(0);
  const started = useSharedValue(false);
  const layoutTick = useSharedValue(0);
  const count = useSharedValue(0);
  const glint = useSharedValue(0);
  useAnimatedReaction(
    () => scrollY.get() + layoutTick.get(),
    () => {
      if (started.get()) return;
      const m = measure(ref);
      if (!m || m.pageY <= 0 || m.pageY + 70 > windowHeight) return;
      started.set(true);
      reveal.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.4)) }));
      count.set(withDelay(COUNT_DELAY_MS, withTiming(rating.overall, { duration: COUNT_MS, easing: Easing.out(Easing.cubic) })));
      glint.set(withDelay(COUNT_DELAY_MS + COUNT_MS - 300, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })));
    },
  );

  const dealStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, reveal.get() * 2),
    transform: [{ perspective: 900 }, { rotateX: `${interpolate(reveal.get(), [0, 1], [55, 0])}deg` }, { scale: interpolate(reveal.get(), [0, 1], [0.9, 1]) }],
  }));

  const numberProps = useAnimatedProps(() => ({ text: String(Math.round(count.get())), defaultValue: String(Math.round(count.get())) }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${x.get() * MAX_ROTATE}deg` }, { rotateX: `${-y.get() * MAX_ROTATE}deg` }],
  }));
  // The logo sits above the surface: it travels a little further than the card.
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * 6 }, { translateY: y.get() * 4 }] }));
  const numberStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * 3 }, { translateY: y.get() * 2 }] }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + 0.4 * Math.min(1, Math.hypot(x.get(), y.get())),
    transform: [{ translateX: x.get() * width * 0.4 }, { rotate: '22deg' }],
  }));
  const glintStyle = useAnimatedStyle(() => ({
    opacity: Math.sin(Math.PI * glint.get()) * 0.9,
    transform: [{ translateX: -width * 0.4 + glint.get() * width * 1.4 }, { rotate: '22deg' }],
  }));

  return (
    <GestureDetector gesture={tilt.gesture}>
      <Animated.View ref={ref} onLayout={() => layoutTick.set(layoutTick.get() + 1)} style={[styles.wrap, dealStyle]} accessible accessibilityLabel={`NBA 2K27 overall ${rating.overall}, number ${rating.rank} of ${NBA2K_TOP_COUNT}`}>
        {/* Shadow on the rotating layer (so it tilts with the card); the inner view clips. */}
        <Animated.View style={[styles.card, { borderColor: withAlpha(tint, 0.5), boxShadow: `0 14px 28px ${withAlpha('#000000', 0.4)}` }, cardStyle]}>
          <View style={styles.clip}>
            <LinearGradient
              colors={[withAlpha(tint, 0.26), withAlpha('#FFFFFF', 0.04), withAlpha(tint, 0.1)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>
              <Animated.View style={logoStyle}>
                <Image source={LOGO} style={styles.logo} contentFit="contain" />
              </Animated.View>
              <View style={styles.row}>
                <Animated.View style={[styles.badge, { borderColor: withAlpha(tint, 0.7), backgroundColor: withAlpha(tint, 0.14) }, numberStyle]}>
                  <AnimatedInput
                    editable={false}
                    pointerEvents="none"
                    // `text` is not in TextInput's types; Reanimated drives it on the UI thread.
                    animatedProps={numberProps as never}
                    style={[styles.overall, { color: tint }]}
                  />
                  <Text style={[styles.ovr, { color: tint }]}>OVR</Text>
                </Animated.View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rank}>#{rating.rank} of {NBA2K_TOP_COUNT}</Text>
                  <Text style={styles.sub}>2K&apos;s published Top 100 · launch rating, 2K adjusts it during the season</Text>
                </View>
              </View>
            </View>
            <Animated.View pointerEvents="none" style={[styles.band, { width: width * 0.5, height: CARD_HEIGHT * 2 }, sheenStyle]}>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.band, { width: width * 0.3, height: CARD_HEIGHT * 2 }, glintStyle]}>
              <LinearGradient
                colors={['rgba(255,255,255,0)', withAlpha(tint, 0.55), 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18, height: CARD_HEIGHT },
  card: { flex: 1, borderRadius: RADIUS, borderWidth: 1, backgroundColor: '#14101F' },
  clip: { flex: 1, borderRadius: RADIUS - 1, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14, justifyContent: 'space-between' },
  logo: { width: 156, height: 64, marginLeft: -6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 84, height: 70, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  overall: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, padding: 0, margin: 0, textAlign: 'center', minWidth: 60 },
  ovr: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, marginTop: -4 },
  rank: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  band: { position: 'absolute', top: '-50%', left: 0 },
});
