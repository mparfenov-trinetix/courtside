import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { CardLights, Skeleton, SkeletonGroup } from '@/components';
import type { Tilt } from '@/hooks';
import type { Team, TeamDetail } from '@/lib/espn';
import { fonts, logoOn, mix, OUTLINE, OUTLINED_LOGO, OUTLINE_STEPS, palette, teamTheme, withAlpha } from '@/lib/theme';
import { waveAt, type RefreshAnimation } from '../TeamRefresh';
import { MAX_ROTATE, RADIUS, GLINT, REFRESH_REACH, SWEEPS } from './constants';


/** Card "deals" in with a quarter flip whenever the team changes. */
const dealIn = new Keyframe({
  0: { opacity: 0, transform: [{ perspective: 900 }, { rotateY: '-75deg' }, { scale: 0.86 }] },
  60: { opacity: 1, transform: [{ perspective: 900 }, { rotateY: '3deg' }, { scale: 1.01 }] },
  100: {
    opacity: 1,
    transform: [{ perspective: 900 }, { rotateY: '0deg' }, { scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
}).duration(650);

export const cardHeight = (width: number) => Math.round(width * 1.4);

type Props = {
  team: Team;
  detail?: TeamDetail;
  width: number;
  /** Tilt source, created by the screen so it can drive page parallax too. */
  tilt: Tilt;
  /** Shared-transition tag for the logo, when the card was opened from a list that shows the same logo. */
  logoTag?: string;
  /** Place in the conference ("7th in the West"); falls back to ESPN's own text. */
  standing?: string;
  /** The run it is on ("W5", "L9"): a bubble at the card's bottom right, at the end of the record row. */
  streak?: string;
  /** The record and place are still coming: skeleton blocks in their place, never dashes. */
  loading?: boolean;
  /** The page's pull-to-refresh: the logo plays the team's own motion and a glint sweeps across the card. */
  refresh?: RefreshAnimation;
};

export function TeamCard({ team, detail, width, tilt, logoTag, standing, streak, loading = false, refresh }: Props) {
  const height = cardHeight(width);
  const theme = teamTheme(team);
  const { x, y } = tilt;

  // Without a refresh animation these hold still, so the card works the same.
  const idle = useSharedValue(0);
  const clock = refresh?.clock ?? idle;
  const busy = refresh?.busy ?? idle;
  const punch = refresh?.punch ?? idle;
  const logoMove = refresh?.motion.logo;
  const StatsRow = loading ? SkeletonGroup : View;

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${x.value * MAX_ROTATE}deg` },
      { rotateX: `${-y.value * MAX_ROTATE}deg` },
      // The card gives a small punch the moment a pull is far enough to refresh.
      { scale: 1 + punch.get() * 0.03 },
    ],
  }));

  // Logo floats above the card surface: it moves a little further than the card. While refreshing it also plays the
  // team's own motion (the Hawks' logo soars, the Rockets' launches...), scaled up from the small mark it was made for.
  const logoStyle = useAnimatedStyle(() => {
    // At rest the logo carries only its tilt shift: any other transform (a perspective, a scale a hair off 1) makes the
    // system resample the image and it goes soft, so the refresh motion is applied only while it plays.
    if (busy.get() < 0.5) return { transform: [{ translateX: x.value * 5 }, { translateY: y.value * 5 }] };
    const c = clock.get();
    return {
      transform: [
        { perspective: 900 },
        { translateX: x.value * 5 + waveAt(logoMove?.x, c) * REFRESH_REACH },
        { translateY: y.value * 5 + waveAt(logoMove?.y, c) * REFRESH_REACH },
        { rotate: `${waveAt(logoMove?.r, c)}deg` },
        { rotateY: `${(logoMove?.flip ?? 0) * 360 * c}deg` },
        { scale: 1 + waveAt(logoMove?.s, c) },
        // A stretch makes the logo taller and thinner, keeping its volume.
        { scaleY: 1 + waveAt(logoMove?.st, c) },
        { scaleX: 1 / (1 + waveAt(logoMove?.st, c)) },
      ],
    };
  });

  // A band of light sweeping across the card: pulled across by the finger, then repeating while refreshing.
  const sweepStyle = useAnimatedStyle(() => {
    const raw = (clock.get() * SWEEPS) % 1;
    const u = raw < 0 ? raw + 1 : raw;
    const show = busy.get();
    return {
      opacity: show * Math.sin(Math.PI * u),
      transform: [{ translateX: -width * 0.5 + u * width * 1.6 }, { rotate: '22deg' }],
    };
  });

  // Court lines sit "under" the surface and drift the other way.
  const courtStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value * 4 }, { translateY: -y.value * 4 }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + 0.4 * Math.min(1, Math.hypot(x.value, y.value)),
    transform: [
      { translateX: x.value * width * 0.4 },
      { translateY: y.value * height * 0.15 },
      { rotate: '22deg' },
    ],
  }));

  return (
    <GestureDetector gesture={tilt.gesture}>
      <Animated.View
        entering={dealIn}
        style={{ width, height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${team.displayName} team card${detail?.record ? `, record ${detail.record}` : ''}`}>
        {/* The shadow lives on the same rotating layer as the card, so it tilts with it and can't be cut by it;
            the inner view does the clipping, because a clipped view can't cast a shadow. */}
        <Animated.View
          style={[
            styles.card,
            { borderRadius: RADIUS, backgroundColor: theme.primary, boxShadow: '0 18px 32px rgba(0,0,0,0.45)' },
            cardStyle,
          ]}>
          <View style={styles.clip}>
          <LinearGradient
            colors={[mix(theme.primary, '#FFFFFF', 0.08), theme.primary, mix(theme.primary, theme.secondary, 0.4)]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <Animated.View style={[StyleSheet.absoluteFill, courtStyle]} pointerEvents="none">
            <CourtLines width={width} height={height} color={withAlpha(theme.onPrimary, 0.09)} />
          </Animated.View>

          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <Animated.View sharedTransitionTag={logoTag}>
              {OUTLINED_LOGO.has(team.abbreviation) && (
                // A white copy of the logo's shape, nudged in eight directions, shows as an outline around the real one.
                <>
                  {OUTLINE_STEPS.map(([dx, dy]) => (
                    <Image
                      key={`${dx}${dy}`}
                      source={logoOn(team, theme.onPrimary)}
                      tintColor="#FFFFFF"
                      contentFit="contain"
                      style={{ position: 'absolute', width: width * 0.58, height: width * 0.58, left: dx * width * OUTLINE, top: dy * width * OUTLINE }}
                    />
                  ))}
                </>
              )}
              <Image
                source={logoOn(team, theme.onPrimary)}
                style={{ width: width * 0.58, height: width * 0.58 }}
                contentFit="contain"
                // Decode at the image's own size and keep it ready: scaled-down decodes look soft while the card flips in.
                allowDownscaling={false}
                priority="high"
                cachePolicy="memory-disk"
              />
            </Animated.View>
          </Animated.View>

          <View style={styles.footer}>
            <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />
            <Text style={[styles.location, { color: withAlpha(theme.onPrimary, 0.75) }]}>
              {team.location}
            </Text>
            <Text
              style={[styles.name, { color: theme.onPrimary, fontSize: width * 0.2 }]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {team.name.toUpperCase()}
            </Text>
            {/* Until the numbers arrive they are skeleton blocks (breathing together), not dashes. */}
            <StatsRow style={styles.statsRow}>
              <Stat label="Record" value={detail?.record ?? '–'} color={theme.onPrimary} loading={loading} />
              <Stat label="Standing" value={standing ?? detail?.standing ?? '–'} color={theme.onPrimary} grow loading={loading} />
              {/* The streak, bottom right on a dark bubble so its green or red reads on every team color. */}
              {streak ? (
                <View
                  style={[styles.streak, { borderColor: withAlpha(streak.startsWith('W') ? palette.win : palette.loss, 0.7) }]}
                  accessible
                  accessibilityLabel={`${streak.startsWith('W') ? 'Won' : 'Lost'} ${streak.slice(1)} in a row`}>
                  <Text style={[styles.streakText, { color: streak.startsWith('W') ? palette.win : palette.loss }]}>{streak}</Text>
                </View>
              ) : null}
            </StatsRow>
          </View>

          {/* Light layers on top */}
          <Animated.View pointerEvents="none" style={[styles.sheen, { width: width * 0.9, height: height * 2 }, sheenStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* The refresh sweep: a soft band of light crossing the card. */}
          <Animated.View pointerEvents="none" style={[styles.sweep, { width: width * 0.4, height: height * 1.6 }, sweepStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <CardLights x={x} y={y} glint={GLINT} />

          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.innerBorder, { borderRadius: RADIUS, borderColor: withAlpha(theme.onPrimary, 0.22) }]}
          />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function Stat({ label, value, color, grow, loading }: { label: string; value: string; color: string; grow?: boolean; loading?: boolean }) {
  return (
    <View style={grow ? { flex: 1 } : { marginRight: 22 }}>
      <Text style={[styles.statLabel, { color: withAlpha(color, 0.6) }]}>{label}</Text>
      {loading ? (
        <Skeleton width={grow ? 110 : 52} height={22} radius={6} style={{ marginVertical: 2, backgroundColor: withAlpha(color, 0.2) }} />
      ) : (
        <Text style={[styles.statValue, { color }]} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

/** Half-court markings: center circle, half line and a key, in a faint tone. */
function CourtLines({ width, height, color }: { width: number; height: number; color: string }) {
  const cx = width / 2;
  const keyW = width * 0.38;
  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={height * 0.42} x2={width} y2={height * 0.42} stroke={color} strokeWidth={2} />
      <Circle cx={cx} cy={height * 0.42} r={width * 0.3} stroke={color} strokeWidth={2} fill="none" />
      <Circle cx={cx} cy={height * 0.42} r={width * 0.1} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={cx - keyW / 2} y={-2} width={keyW} height={height * 0.14} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: RADIUS,
  },
  logoWrap: {
    position: 'absolute',
    top: '9%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  streak: { minWidth: 44, height: 28, marginLeft: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.62)' },
  streakText: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22 },
  footer: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 22,
  },
  stripe: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  location: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    letterSpacing: 0.4,
  },
  name: {
    fontFamily: fonts.display,
    marginTop: -4,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  sweep: { position: 'absolute', top: '-30%', left: 0 },
  sheen: {
    position: 'absolute',
    top: '-50%',
    left: '5%',
  },
  innerBorder: {
    borderWidth: 1.5,
  },
});
