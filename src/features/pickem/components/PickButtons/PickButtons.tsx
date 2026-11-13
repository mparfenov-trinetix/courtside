import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, CrossIcon } from '@/components';
import type { GamePick, PickableGame, PickSide } from '@/lib/league';
import { fonts, palette, space, withAlpha } from '@/lib/theme';
import { SIZES } from './constants';
import { usePickChoice } from './usePickChoice';

/**
 * Two big buttons, one per side, each a team's logo on its own color, to call the winner of a game before tip-off. The chosen side is
 * lit and ticked; a tap on it again takes the pick back; at tip-off both lock, and once the game is final the chosen side turns green
 * (right) or red (wrong). `favoriteId` is who is favored right now, saved with the pick so the score card can say how you did against
 * the favorite (it is not printed: the win probability above says the same).
 */
export function PickButtons({
  game,
  colors,
  favoriteId,
  size = 'lg',
}: {
  game: PickableGame;
  colors?: { away: string; home: string };
  favoriteId?: string;
  size?: keyof typeof SIZES;
}) {
  const { pick, locked, choose } = usePickChoice(game, favoriteId);
  return (
    <View style={styles.row}>
      <Side side={game.away} color={colors?.away} pick={pick} locked={locked} size={size} onPress={() => choose(game.away)} />
      <Side side={game.home} color={colors?.home} pick={pick} locked={locked} size={size} onPress={() => choose(game.home)} />
    </View>
  );
}

function Side({
  side,
  color = palette.maple,
  pick,
  locked,
  size,
  onPress,
}: {
  side: PickSide;
  color?: string;
  pick?: GamePick;
  locked: boolean;
  size: keyof typeof SIZES;
  onPress: () => void;
}) {
  const s = SIZES[size];
  const chosen = pick?.teamId === side.id;
  const outcome = chosen && pick?.winnerId ? (pick.winnerId === side.id ? 'win' : 'loss') : null;
  const tone = outcome === 'win' ? palette.win : outcome === 'loss' ? palette.loss : color;
  // A locked button that was not chosen steps back; the chosen one keeps its light.
  const dim = locked && !chosen;
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen, disabled: locked }}
      accessibilityLabel={`Pick ${side.abbr} to win`}
      style={({ pressed }) => [
        styles.side,
        { height: s.height, borderRadius: s.radius },
        // Each side on its own color, so the two read as the two teams before the logos do; the chosen one is stronger, with an edge.
        chosen
          ? { backgroundColor: withAlpha(tone, 0.5), borderColor: tone }
          : { backgroundColor: withAlpha(color, 0.22), borderColor: withAlpha(color, 0.35) },
        dim && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
      ]}>
      {side.logo ? <Image source={side.logo} style={{ width: s.logo, height: s.logo }} contentFit="contain" /> : <Text style={styles.abbr}>{side.abbr}</Text>}
      {chosen ? (
        <View style={[styles.mark, { backgroundColor: tone }]}>
          {outcome === 'loss' ? <CrossIcon size={12} color={palette.arena} /> : <CheckIcon size={12} color={palette.arena} />}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  side: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  abbr: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
  mark: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
