import type { ComponentProps } from 'react';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { motion } from '@/lib/theme';

/**
 * How a section that turns up after its screen is already open comes in, the way the key matchup does: the section fades in (`entering={ARRIVE}`
 * on its root view) and what is below it glides down to make room (`<Glide>` around each block under it, or `layout={GLIDE}` on its root view)
 * instead of jumping. Reanimated animates a layout only when it changes after the first draw, so a screen that is just opening is not
 * affected; and both follow the system's Reduce Motion. Use it for a section that renders nothing until its data arrives (odds, a best
 * player, a series), not for a list that is there from the first frame.
 */
export const GLIDE = LinearTransition.duration(motion.slow - 110);
export const ARRIVE = FadeIn.duration(motion.base + 60);

/** A block that glides to its new place when a section above it appears or goes. */
export function Glide(props: ComponentProps<typeof Animated.View>) {
  return <Animated.View layout={GLIDE} {...props} />;
}
