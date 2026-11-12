import { Easing, Keyframe } from 'react-native-reanimated';

/**
 * A card dealt in when it has just been chosen (Compare): it fades up and slides in from its own side (`side`: the left card from the left,
 * the right card from the right) with a small grow, and lands where it sits. `delay` staggers the second card of a pair. Flat on purpose:
 * a card that turns in perspective swings over the VS badge between the two cards, whatever the badge's `zIndex` (3D layers ignore it),
 * and this one never goes past its own side of the middle.
 */
export const dealIn = (side: 'left' | 'right', delay = 0) => {
  const from = side === 'left' ? -44 : 44;
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateX: from }, { translateY: 14 }, { scale: 0.9 }] },
    100: { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }], easing: Easing.out(Easing.cubic) },
  })
    .duration(480)
    .delay(delay);
};
