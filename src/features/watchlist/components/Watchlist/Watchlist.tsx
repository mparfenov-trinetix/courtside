import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { StarIcon } from '@/components';
import { usePlayerGameLog, usePlayerStats } from '@/hooks';
import { headshotUrl } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { useWatchlist, type WatchedPlayer } from '@/state';
import { goToScreen, openDetail } from '@/navigation';

/** Home card section: only the watched players who play for the team on screen. */
export function Watchlist({ accent, teamId, teamAbbr }: { accent: string; teamId: string; teamAbbr?: string }) {
  const { players } = useWatchlist();
  const mine = players.filter((p) => p.teamId === teamId);
  const others = players.length - mine.length;
  if (players.length === 0) return null;

  return (
    <Animated.View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Watchlist{teamAbbr && mine.length > 0 ? ` · ${teamAbbr}` : ''}</Text>
        <Pressable onPress={() => goToScreen('/watchlist' as Href)} hitSlop={8}>
          <Text style={[styles.viewAll, { color: accent }]}>All watched · {players.length}</Text>
        </Pressable>
      </View>
      {mine.length > 0 ? (
        <View style={styles.list}>
          {mine.map((p) => (
            <WatchRow key={p.id} player={p} accent={accent} />
          ))}
        </View>
      ) : (
        <Text style={styles.none}>
          None of your {others} watched player{others === 1 ? '' : 's'} play for this team.
        </Text>
      )}
    </Animated.View>
  );
}

export function WatchRow({
  player,
  accent,
  teamLabel,
  onRemove,
}: {
  player: WatchedPlayer;
  accent: string;
  /** Shown instead of the last-game line's opponent context when listing across teams. */
  teamLabel?: string;
  onRemove?: () => void;
}) {
  const { data } = usePlayerGameLog(player.id);
  const { data: season } = usePlayerStats(teamLabel ? player.id : undefined);
  const last = data?.[0];

  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId: player.teamId } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={[styles.avatar, { backgroundColor: withAlpha(accent, 0.25) }]}>
        <Image source={headshotUrl(player.id)} style={styles.img} contentFit="cover" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {teamLabel ? `${teamLabel} · ` : ''}
          {season?.ppg != null && teamLabel
            ? `${season.ppg.toFixed(1)} PPG · ${season.rpg?.toFixed(1) ?? '–'} RPG · ${season.apg?.toFixed(1) ?? '–'} APG`
            : last
              ? `${last.home ? 'vs' : '@'} ${last.opponent} · ${last.result ?? ''} ${last.teamScore}–${last.opponentScore}`
              : 'No games yet'}
        </Text>
      </View>
      {last && (
        <View style={styles.line}>
          <Stat value={last.pts} label="PTS" strong accent={accent} />
          <Stat value={last.reb} label="REB" />
          <Stat value={last.ast} label="AST" />
        </View>
      )}
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${player.name} from watchlist`}
          style={styles.remove}>
          <StarIcon color={accent} size={20} filled />
        </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
  },
  viewAll: { fontFamily: fonts.bodySemi, fontSize: 12 },
  none: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, paddingHorizontal: 4 },
  remove: { paddingLeft: 4 },
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
