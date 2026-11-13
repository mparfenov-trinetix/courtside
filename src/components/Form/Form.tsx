import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { fonts, motion, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { LOSS, WIN } from './constants';

type Result = { id: string; result: 'W' | 'L' };

const SLIDE = LinearTransition.duration(motion.base);

/**
 * Last results as small W / L circles, oldest to newest. The row is drawn from a schedule that may have been kept on disk, so a game that
 * ended since can arrive a moment after the card opens: the circles then slide along and the new one fades in at the end, instead of the
 * row jumping. What is there when the row first appears is drawn as it is, with no entrance.
 */
export function FormDots({ games }: { games: Result[] }) {
  const [first] = useState(() => new Set(games.map((g) => g.id)));
  return (
    <>
      {games.map((g) => (
        <Animated.View
          key={g.id}
          layout={SLIDE}
          entering={first.has(g.id) ? undefined : FadeIn.duration(motion.base)}
          exiting={FadeOut.duration(motion.fast)}
          style={[styles.dot, { backgroundColor: withAlpha(g.result === 'W' ? WIN : LOSS, 0.2) }]}>
          <Text style={[styles.dotText, { color: g.result === 'W' ? WIN : LOSS }]}>{g.result}</Text>
        </Animated.View>
      ))}
    </>
  );
}

export type FormChip = Result & {
  teamScore: number;
  opponentScore: number;
  opponentAbbr: string;
  home: boolean;
};

/** The same circles with who it was against and the score underneath. A tap opens that game. */
export function FormChips({ games }: { games: FormChip[] }) {
  return (
    <View style={styles.chips}>
      {games.map((g) => (
        <Pressable
          key={g.id}
          onPress={() => openDetail({ pathname: '/game/[id]', params: { id: g.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${g.result === 'W' ? 'Won' : 'Lost'} ${g.home ? 'vs' : 'at'} ${g.opponentAbbr}, ${g.teamScore} to ${g.opponentScore}`}
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
          <View style={[styles.dot, { backgroundColor: withAlpha(g.result === 'W' ? WIN : LOSS, 0.2) }]}>
            <Text style={[styles.dotText, { color: g.result === 'W' ? WIN : LOSS }]}>{g.result}</Text>
          </View>
          <Text style={styles.opp} numberOfLines={1}>
            {g.home ? 'vs' : '@'} {g.opponentAbbr}
          </Text>
          <Text style={styles.score}>
            {g.teamScore}–{g.opponentScore}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { flex: 1, alignItems: 'center', gap: 3 },
  opp: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.chalk },
  score: { fontFamily: fonts.body, fontSize: 10, color: palette.muted },
});
