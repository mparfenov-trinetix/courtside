import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, CrossIcon } from '@/components';
import type { GamePick, PickableGame, PickSide } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { usePickChoice } from '../PickButtons';

/**
 * The win probability's two numbers as the two vote buttons: each half is a team's logo, code and chance, and a tap on it is your call
 * (again takes it back). The chosen half is lit in its team's color with a tick; at tip-off both lock. It replaces the pick card's own
 * big tiles on the game page, so your call lives inside the one card that holds the chances to weigh it against.
 */
export function PickSplit({
  game,
  colors,
  favoriteId,
  pct,
}: {
  game: PickableGame;
  colors: { away: string; home: string };
  favoriteId?: string;
  pct: { away: number; home: number };
}) {
  const { pick, locked, choose } = usePickChoice(game, favoriteId);
  return (
    <View style={styles.row}>
      <Half side={game.away} color={colors.away} pct={pct.away} pick={pick} locked={locked} onPress={() => choose(game.away)} />
      <Half side={game.home} color={colors.home} pct={pct.home} pick={pick} locked={locked} onPress={() => choose(game.home)} reverse />
    </View>
  );
}

function Half({
  side,
  color,
  pct,
  pick,
  locked,
  onPress,
  reverse,
}: {
  side: PickSide;
  color: string;
  pct: number;
  pick?: GamePick;
  locked: boolean;
  onPress: () => void;
  reverse?: boolean;
}) {
  const chosen = pick?.teamId === side.id;
  // Once the game is final the chosen half turns green (right) or red (wrong), like the big tiles.
  const outcome = chosen && pick?.winnerId ? (pick.winnerId === side.id ? 'win' : 'loss') : null;
  const tone = outcome === 'win' ? palette.win : outcome === 'loss' ? palette.loss : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen, disabled: locked }}
      accessibilityLabel={`Pick ${side.abbr} to win, ${pct}% chance`}
      style={({ pressed }) => [
        styles.half,
        reverse && styles.reverse,
        chosen ? { backgroundColor: withAlpha(tone, 0.2), borderColor: tone } : { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.3) },
        // A lock only steps the other half back when there is a pick to show; with none (a final you did not call) both stay as they are.
        locked && !!pick && !chosen && { opacity: 0.6 },
        pressed && { opacity: 0.8 },
      ]}>
      {side.logo ? <Image source={side.logo} style={styles.logo} contentFit="contain" /> : null}
      <View style={[styles.text, reverse && { alignItems: 'flex-end' }]}>
        <Text style={[styles.abbr, chosen && { color: withAlpha(palette.chalk, 0.8) }]}>{side.abbr}</Text>
        <Text style={[styles.pct, { color: chosen ? palette.chalk : color }]}>{pct}%</Text>
      </View>
      {chosen ? (
        <View style={[styles.mark, { backgroundColor: tone }, reverse ? { left: 6 } : { right: 6 }]}>
          {outcome === 'loss' ? <CrossIcon size={10} color={palette.arena} /> : <CheckIcon size={10} color={palette.arena} />}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5 },
  reverse: { flexDirection: 'row-reverse' },
  logo: { width: 32, height: 32 },
  text: { flex: 1 },
  abbr: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  pct: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  mark: { position: 'absolute', top: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
