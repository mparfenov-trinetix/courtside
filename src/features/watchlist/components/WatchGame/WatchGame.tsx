import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StarIcon } from '@/components';
import { useGameSummary } from '@/hooks';
import { kickoffLabel } from '@/lib/date';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';
import type { WatchedGame } from '@/state';

const GOLD = palette.gold;

/**
 * A starred game: the two teams and, once there is something to say, the score and where it stands (live, final), or
 * when it starts. Shows what was saved at once, and fills in from the game itself (kept offline once it is final).
 */
export function WatchGame({ game, onRemove }: { game: WatchedGame; onRemove: () => void }) {
  const { data } = useGameSummary(game.id);
  const started = !!data && (data.completed || data.live);
  const away = data?.away.score;
  const home = data?.home.score;
  const date = data?.info.date ?? game.date;

  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${game.away.abbr} at ${game.home.abbr}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.teams}>
        <Side side={game.away} score={started ? away : undefined} win={started && data!.completed && (away ?? 0) > (home ?? 0)} />
        <Side side={game.home} score={started ? home : undefined} win={started && data!.completed && (home ?? 0) > (away ?? 0)} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.status, data?.live && { color: palette.loss }]} numberOfLines={1}>
          {started ? data!.status : date ? kickoffLabel(date) : ''}
        </Text>
        {started && date ? <Text style={styles.date}>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text> : null}
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${game.away.abbr} at ${game.home.abbr} from watchlist`}
        style={styles.remove}>
        <StarIcon color={GOLD} size={20} filled />
      </Pressable>
    </Pressable>
  );
}

function Side({ side, score, win }: { side: WatchedGame['away']; score?: number; win: boolean }) {
  return (
    <View style={styles.side}>
      {side.logo ? <Image source={side.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
      <Text style={[styles.abbr, win && { color: palette.chalk }]}>{side.abbr}</Text>
      <Text style={[styles.score, win && { color: palette.chalk }]}>{score ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: surfaces.card },
  teams: { flex: 1, gap: 6 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 24, height: 24 },
  abbr: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: withAlpha(palette.chalk, 0.75) },
  score: { fontFamily: fonts.display, fontSize: 22, color: withAlpha(palette.chalk, 0.75), minWidth: 36, textAlign: 'right' },
  info: { alignItems: 'flex-end', gap: 2, maxWidth: 120 },
  status: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, textAlign: 'right' },
  date: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  remove: { paddingLeft: 4 },
});
