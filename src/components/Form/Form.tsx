import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { LOSS, WIN } from './constants';

type Result = { id: string; result: 'W' | 'L' };

/** Last results as small W / L circles, oldest to newest. */
export function FormDots({ games }: { games: Result[] }) {
  return (
    <>
      {games.map((g) => (
        <View key={g.id} style={[styles.dot, { backgroundColor: withAlpha(g.result === 'W' ? WIN : LOSS, 0.2) }]}>
          <Text style={[styles.dotText, { color: g.result === 'W' ? WIN : LOSS }]}>{g.result}</Text>
        </View>
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
