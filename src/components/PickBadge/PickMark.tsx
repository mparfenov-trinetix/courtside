import { StyleSheet, View } from 'react-native';

import { resultOf, type GamePick } from '@/lib/league';
import { palette } from '@/lib/theme';
import { CheckIcon, CrossIcon } from '../Icons';

/**
 * The mark under the logo of the team you picked: a gold tick while the game waits, green when you were right, red with a cross when not.
 * Place it in a view that is as big as the logo (it hangs on the bottom edge, centered). Nothing is drawn
 * for the other side or when there is no pick.
 */
export function PickMark({ pick, teamId, size = 16 }: { pick?: GamePick; teamId: string; size?: number }) {
  if (!pick || pick.teamId !== teamId) return null;
  const result = resultOf(pick);
  const color = result === 'win' ? palette.win : result === 'loss' ? palette.loss : palette.gold;
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`Your pick${result === 'pending' ? '' : result === 'win' ? ', right' : ', wrong'}`}
      style={[styles.mark, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, bottom: -size / 3, left: '50%', marginLeft: -size / 2 }]}>
      {result === 'loss' ? <CrossIcon size={size - 6} color={palette.arena} /> : <CheckIcon size={size - 6} color={palette.arena} />}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: palette.arena },
});
