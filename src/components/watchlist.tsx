import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { usePlayerGameLog } from '@/hooks/queries';
import { headshotUrl } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { useWatchlist, type WatchedPlayer } from '@/state/watchlist-store';

export function Watchlist({ accent }: { accent: string }) {
  const { players } = useWatchlist();
  if (players.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(110).duration(300)} style={styles.wrap}>
      <Text style={styles.title}>Watchlist</Text>
      <View style={styles.list}>
        {players.map((p) => (
          <WatchRow key={p.id} player={p} accent={accent} />
        ))}
      </View>
    </Animated.View>
  );
}

function WatchRow({ player, accent }: { player: WatchedPlayer; accent: string }) {
  const { data } = usePlayerGameLog(player.id);
  const last = data?.[0];

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/player/[id]', params: { id: player.id, teamId: player.teamId } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={[styles.avatar, { backgroundColor: withAlpha(accent, 0.25) }]}>
        <Image source={headshotUrl(player.id)} style={styles.img} contentFit="cover" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {last ? `${last.home ? 'vs' : '@'} ${last.opponent} · ${last.result ?? ''} ${last.teamScore}–${last.opponentScore}` : 'No games yet'}
        </Text>
      </View>
      {last && (
        <View style={styles.line}>
          <Stat value={last.pts} label="PTS" strong accent={accent} />
          <Stat value={last.reb} label="REB" />
          <Stat value={last.ast} label="AST" />
        </View>
      )}
    </Pressable>
  );
}

function Stat({ value, label, strong, accent }: { value: number; label: string; strong?: boolean; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, strong && { color: accent, fontFamily: fonts.display, fontSize: 22 }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22, paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: withAlpha('#FFFFFF', 0.05),
  },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  img: { width: 54, height: 46 },
  info: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 1 },
  line: { flexDirection: 'row', gap: 12 },
  stat: { alignItems: 'center', minWidth: 28 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: withAlpha(palette.chalk, 0.85) },
  statLabel: { fontFamily: fonts.body, fontSize: 9, color: palette.muted, letterSpacing: 0.4 },
});
