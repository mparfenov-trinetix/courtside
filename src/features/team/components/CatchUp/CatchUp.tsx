import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { StarIcon } from '@/components';
import { usePlayerGameLogs, useStandings, useTeam } from '@/hooks';
import { headshotUrl, type Game } from '@/lib/espn';
import { buildCatchUp, type CatchUpItem } from '@/lib/league';
import { fonts, palette, radius, surfaces, teamTheme, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { useLastVisit, useWatchlist } from '@/state';
import { DOWN, UP } from './constants';

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
        <Text style={styles.title}>While you were away</Text>
        <Text style={styles.ago}>{ago(sessionStart - previous.at)}</Text>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      {items.map((item, i) => (
        <View key={item.id} style={i > 0 && styles.divided}>
          <Row item={item} accent={accent} />
        </View>
      ))}
    </Animated.View>
  );
}

function Row({ item, accent }: { item: CatchUpItem; accent: string }) {
  if (item.kind === 'player') return <PlayerRow item={item} accent={accent} />;
  if (item.kind === 'standing') {
    const up = item.to < item.from;
    const color = up ? UP : DOWN;
    return (
      <View style={styles.row}>
        <View style={[styles.tile, { backgroundColor: withAlpha(color, 0.16) }]}>
          <Text style={[styles.tileText, { color, fontSize: 13 }]}>{up ? '▲' : '▼'}</Text>
        </View>
        <Text style={styles.text}>
          {up ? 'Moved up to ' : 'Dropped to '}
          {item.to}
          {suffix(item.to)}
        </Text>
        <Text style={styles.sub}>
          from {item.from}
          {suffix(item.from)}
        </Text>
      </View>
    );
  }
  const color = item.result === 'W' ? UP : DOWN;
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: item.gameId } })}
      accessibilityRole="button"
      accessibilityLabel={item.text}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.tile, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Text style={[styles.tileText, { color }]}>{item.result}</Text>
      </View>
      <Text style={styles.score}>{item.score}</Text>
      <Text style={styles.sub}>
        {item.home ? 'vs' : '@'} {item.opponent}
      </Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

/** A watched player's last game: his photo on his team's color, with a star since he is on your watchlist, and the three numbers that matter. */
function PlayerRow({ item, accent }: { item: Extract<CatchUpItem, { kind: 'player' }>; accent: string }) {
  const team = useTeam(item.teamId);
  const brand = team ? teamTheme(team).brand : accent;
  const resultColor = item.result === 'W' ? UP : item.result === 'L' ? DOWN : palette.muted;
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/player/[id]', params: { id: item.playerId, teamId: item.teamId } })}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.line}, ${item.context}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(brand, 0.4) }]}>
          <Image source={headshotUrl(item.playerId)} style={styles.img} contentFit="cover" />
        </View>
        <View style={styles.star}>
          <StarIcon size={10} color={palette.gold} filled />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.result ? <Text style={{ color: resultColor, fontFamily: fonts.bodyBold }}>{item.result} </Text> : null}
          {item.home ? 'vs' : '@'} {item.opponent}
        </Text>
      </View>
      <Stat value={item.pts} label="PTS" color={accent} big />
      <Stat value={item.reb} label="REB" />
      <Stat value={item.ast} label="AST" />
    </Pressable>
  );
}

function Stat({ value, label, color = palette.chalk, big }: { value: number; label: string; color?: string; big?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }, big && styles.statBig]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const suffix = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 18, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6, borderRadius: 18, borderWidth: 1, backgroundColor: surfaces.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: withAlpha(palette.chalk, 0.6) },
  ago: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  close: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: surfaces.raised },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: palette.muted },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.1) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  pressed: { opacity: 0.75 },
  tile: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.display, fontSize: 17 },
  score: { fontFamily: fonts.display, fontSize: 22, color: palette.chalk },
  text: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  chevron: { marginLeft: 'auto', fontFamily: fonts.bodyBold, fontSize: 20, color: palette.muted },
  avatarWrap: { width: 42, height: 42 },
  avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  img: { width: 50, height: 42 },
  star: { position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.arena },
  info: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  stat: { alignItems: 'center', minWidth: 28 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 16 },
  statBig: { fontFamily: fonts.display, fontSize: 22 },
  statLabel: { fontFamily: fonts.body, fontSize: 9, letterSpacing: 0.4, color: palette.muted },
});
