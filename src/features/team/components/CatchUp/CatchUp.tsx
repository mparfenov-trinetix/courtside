import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { useStandings, usePlayerGameLogs } from '@/hooks';
import type { Game } from '@/lib/espn';
import { buildCatchUp, type CatchUpItem } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { useLastVisit, useWatchlist } from '@/state';
import { UP, DOWN } from './constants';

const ago = (ms: number) => {
  const h = Math.round(ms / 3_600_000);
  return h < 36 ? `${h} hours` : `${Math.round(h / 24)} days`;
};

/**
 * "While you were away": your team's results since the app was last open, whether it moved in the standings, and how the
 * players you watch did. Shown on your own team's home page, once per session (it can be dismissed).
 */
export function CatchUp({ teamId, schedule, accent }: { teamId: string; schedule?: Game[]; accent: string }) {
  const { previous, sessionStart, dismissed, dismiss, remember } = useLastVisit();
  const { players } = useWatchlist();
  const { data: standings } = useStandings();
  const watched = players.slice(0, 8);
  const logs = usePlayerGameLogs(watched.map((p) => p.id));

  const seedNow = [...(standings?.east ?? []), ...(standings?.west ?? [])].find((e) => e.teamId === teamId)?.seed;
  // Report where the team stands now, so the next visit can say what moved.
  useEffect(() => {
    if (seedNow != null) remember(teamId, seedNow);
  }, [teamId, seedNow, remember]);

  if (!previous || dismissed) return null;
  const items = buildCatchUp({
    since: previous.at,
    now: sessionStart,
    schedule,
    seedBefore: previous.teamId === teamId ? previous.seed : undefined,
    seedNow,
    watched: watched.map((p, i) => ({ ...p, log: logs[i]?.data })),
  });
  if (items.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(160)} style={[styles.card, { borderColor: withAlpha(accent, 0.35) }]}>
      <View style={styles.head}>
        <Text style={styles.title}>While you were away · {ago(sessionStart - previous.at)}</Text>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </Animated.View>
  );
}

function Row({ item }: { item: CatchUpItem }) {
  if (item.kind === 'standing') {
    const up = item.to < item.from;
    return (
      <View style={styles.row}>
        <Text style={[styles.badge, { color: up ? UP : DOWN }]}>{up ? '▲' : '▼'}</Text>
        <Text style={styles.text}>
          {up ? 'Moved up' : 'Dropped'} to {item.to}
          {suffix(item.to)} <Text style={styles.sub}>(was {item.from}{suffix(item.from)})</Text>
        </Text>
      </View>
    );
  }
  const press = () => openDetail({ pathname: '/game/[id]', params: { id: item.gameId } });
  if (item.kind === 'result') {
    return (
      <Pressable onPress={press} accessibilityRole="button" style={styles.row}>
        <Text style={[styles.badge, { color: item.result === 'W' ? UP : DOWN }]}>{item.result}</Text>
        <Text style={styles.text}>{item.text.slice(2)}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={press} accessibilityRole="button" style={styles.row}>
      <Text style={styles.badge}>★</Text>
      <Text style={styles.text} numberOfLines={1}>
        {item.name} <Text style={styles.sub}>{item.line} · {item.context}</Text>
      </Text>
    </Pressable>
  );
}

const suffix = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 18, padding: 14, borderRadius: 18, borderWidth: 1, backgroundColor: withAlpha('#FFFFFF', 0.05), gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: withAlpha(palette.chalk, 0.6) },
  close: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  badge: { width: 18, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 14, color: '#FBBF24' },
  text: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
});
