import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BoxScoreTeam } from '@/lib/espn';
import { fonts } from '@/lib/theme';
import { openDetail, sharedTag } from '@/navigation';
import { BAR_LOGO, BAR_ROW, BAR_TOP, HERO_LOGO } from './constants';

/** Where a logo sits in the big header, measured on screen at scroll 0 (its center). */
export type LogoSlot = { x: number; y: number };

/**
 * The two team logos, drawn above the scrolling page. They start on the big header's slots and, as the page scrolls,
 * ride up with it and glide in toward the middle of the top bar, shrinking on the way: they are never hidden, so the
 * big logos and the compact ones are the same pair.
 */
export function GameLogos({
  away,
  home,
  scrollY,
  awaySlot,
  homeSlot,
  hasStarted,
  awayBonus,
  homeBonus,
  gameId,
  origin,
}: {
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  scrollY: SharedValue<number>;
  awaySlot: SharedValue<LogoSlot>;
  homeSlot: SharedValue<LogoSlot>;
  hasStarted: boolean;
  /** The team is in the bonus this period (live games): a light gold "B" sits at the logo's inner bottom corner (the side facing the score) until the header collapses. */
  awayBonus: boolean;
  homeBonus: boolean;
  /** With `origin`, names the logos that fly in from the list this game was opened from. */
  gameId?: string;
  origin?: string;
}) {
  return (
    <Animated.View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Logo team={away} side={-1} scrollY={scrollY} slot={awaySlot} hasStarted={hasStarted} bonus={awayBonus} tag={sharedTag(origin, 'game', gameId ?? '', 'away', 'logo')} />
      <Logo team={home} side={1} scrollY={scrollY} slot={homeSlot} hasStarted={hasStarted} bonus={homeBonus} tag={sharedTag(origin, 'game', gameId ?? '', 'home', 'logo')} />
    </Animated.View>
  );
}

function Logo({
  team,
  side,
  scrollY,
  slot,
  hasStarted,
  bonus,
  tag,
}: {
  team: BoxScoreTeam;
  side: -1 | 1;
  scrollY: SharedValue<number>;
  slot: SharedValue<LogoSlot>;
  hasStarted: boolean;
  bonus: boolean;
  tag?: string;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barY = insets.top + BAR_TOP + BAR_ROW / 2;
  const { size, offset } = hasStarted ? BAR_LOGO.started : BAR_LOGO.pregame;
  const barX = width / 2 + side * offset;
  const half = HERO_LOGO / 2;

  const style = useAnimatedStyle(() => {
    const from = slot.get();
    const scroll = scrollY.get();
    // How far along the trip the page has scrolled: the whole distance the logo has to climb to reach the bar.
    const progress = Math.min(1, Math.max(0, scroll / Math.max(1, from.y - barY)));
    return {
      transform: [
        { translateX: from.x - half + (barX - from.x) * progress },
        // Rides up with the page, then stays at the bar.
        { translateY: Math.max(from.y - scroll, barY) - half },
        { scale: 1 + (size / HERO_LOGO - 1) * progress },
      ],
    };
  });

  // The badge belongs to the big header only: it is gone before the logo has moved a few points.
  const badge = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - scrollY.get() / 24) }));

  const source = team.team.logoDark || team.team.logo;
  return (
    <Animated.View style={[styles.logo, style]}>
      <Pressable
        onPress={() => openDetail(`/team/${team.team.id}` as Href)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${team.team.abbreviation}`}
        hitSlop={6}
        style={({ pressed }) => [StyleSheet.absoluteFill, pressed && { opacity: 0.7 }]}>
        <Animated.View sharedTransitionTag={tag} style={StyleSheet.absoluteFill}>
          {source ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
        </Animated.View>
      </Pressable>
      {bonus ? (
        <Animated.View
          pointerEvents="none"
          // Away (left of the score) wears it at the logo's bottom right, home (right of the score) at its bottom left: always the corner nearest the score.
          style={[styles.bonus, side === -1 ? styles.bonusInnerRight : styles.bonusInnerLeft, badge]}
          accessible
          accessibilityLabel={`${team.team.abbreviation} in the bonus`}>
          <Text style={styles.bonusText}>B</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logo: { position: 'absolute', left: 0, top: 0, width: HERO_LOGO, height: HERO_LOGO },
  // A light-gold rounded square (not a disc) with a dark B, overlapping the logo's inner bottom corner.
  bonus: { position: 'absolute', bottom: -3, width: 19, height: 16, borderRadius: 6, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' },
  bonusInnerLeft: { left: -4 },
  bonusInnerRight: { right: -4 },
  bonusText: { fontFamily: fonts.displayBold, fontSize: 11, lineHeight: 13, color: '#5B4300' },
});
