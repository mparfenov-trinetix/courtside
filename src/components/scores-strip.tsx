import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useScoreboardByDate } from '@/hooks/queries';
import { toDateKey } from '@/lib/date';
import type { ScoreboardGame, ScoreboardTeam } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

export function ScoresStrip({ accent, highlightTeamId }: { accent: string; highlightTeamId?: string | null }) {
  const dateKey = useMemo(() => toDateKey(new Date()), []);
  const { data: games } = useScoreboardByDate(dateKey);

  if (!games || games.length === 0) return null;

  const ordered = [...games].sort((a, b) => {
    const rank = (g: ScoreboardGame) => (g.inProgress ? 0 : g.completed ? 2 : 1);
    return rank(a) - rank(b) || new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const anyLive = games.some((g) => g.inProgress);

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Around the league</Text>
        {anyLive && (
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {ordered.map((g) => {
          const mine = !!highlightTeamId && (g.home.teamId === highlightTeamId || g.away.teamId === highlightTeamId);
          return (
            <Pressable
              key={g.id}
              onPress={() => router.push({ pathname: '/game/[id]', params: { id: g.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.card,
                mine && { borderColor: withAlpha(accent, 0.6) },
                g.inProgress && { backgroundColor: withAlpha('#4ADE80', 0.08) },
                pressed && { opacity: 0.75 },
              ]}>
              <Side team={g.away} completed={g.completed} />
              <Side team={g.home} completed={g.completed} />
              <Text style={[styles.status, g.inProgress && { color: '#4ADE80' }]} numberOfLines={1}>
                {!g.completed && !g.inProgress
                  ? new Date(g.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : g.status}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

function Side({ team, completed }: { team: ScoreboardTeam; completed: boolean }) {
  const dim = completed && !team.winner;
  return (
    <View style={styles.side}>
      {team.logo ? <Image source={team.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
      <Text style={[styles.abbr, dim && { color: withAlpha(palette.chalk, 0.5) }]}>{team.abbreviation}</Text>
      <Text style={[styles.score, dim && { color: withAlpha(palette.chalk, 0.5) }]}>
        {team.score != null ? Math.round(team.score) : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: withAlpha('#4ADE80', 0.14),
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 10, color: '#4ADE80', letterSpacing: 0.5 },
  list: { gap: 8, paddingHorizontal: 16 },
  card: {
    width: 138,
    padding: 12,
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: withAlpha('#FFFFFF', 0.06),
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 24, height: 24 },
  abbr: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  score: { fontFamily: fonts.display, fontSize: 20, color: palette.chalk },
  status: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, marginTop: 2 },
});
