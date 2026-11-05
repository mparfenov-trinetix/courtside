import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FormDots } from '@/components';
import type { Game } from '@/lib/espn';
import { fonts, palette, type TeamTheme, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

const GAME_WINDOW_MS = 3.5 * 60 * 60 * 1000;

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function countdown(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function NextGame({ schedule, theme }: { schedule: Game[]; theme: TeamTheme }) {
  const now = useNow(30_000);

  const upcoming = schedule
    .filter((g) => !g.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const next = upcoming[0];
  const form = schedule
    .filter((g) => g.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .flatMap((g) => (g.result ? [{ id: g.id, result: g.result }] : []))
    .slice(0, 5)
    .reverse();

  if (!next) return null;

  const start = new Date(next.date).getTime();
  const live = now >= start && now - start < GAME_WINDOW_MS;
  const when = new Date(next.date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.label}>{live ? 'Playing now' : 'Next game'}</Text>
      <Pressable
        onPress={() => openDetail({ pathname: '/game/[id]', params: { id: next.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${next.home ? 'vs' : 'at'} ${next.opponent}, ${when}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: withAlpha(theme.primary, 0.32), borderColor: withAlpha(theme.accent, 0.35) },
          pressed && { opacity: 0.8 },
        ]}>
        {next.opponentLogo ? (
          <Image source={next.opponentLogo} style={styles.logo} contentFit="contain" />
        ) : (
          <View style={[styles.logo, { backgroundColor: withAlpha(palette.chalk, 0.1), borderRadius: 26 }]} />
        )}
        <View style={styles.info}>
          <Text style={styles.opp} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {next.home ? 'vs' : '@'} {next.opponent}
          </Text>
          <Text style={styles.when}>{when}</Text>
        </View>
        <View style={styles.right}>
          {live ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.count, { color: theme.accent }]}>{countdown(start - now)}</Text>
              <Text style={styles.countLabel}>to tip-off</Text>
            </>
          )}
        </View>
      </Pressable>

      {form.length > 0 && (
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Form</Text>
          <FormDots games={form} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 12 },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  logo: { width: 52, height: 52 },
  info: { flex: 1, gap: 2 },
  opp: { fontFamily: fonts.displayBold, fontSize: 24, color: palette.chalk },
  when: { fontFamily: fonts.body, fontSize: 13, color: withAlpha(palette.chalk, 0.7) },
  right: { alignItems: 'flex-end' },
  count: { fontFamily: fonts.display, fontSize: 28 },
  countLabel: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: withAlpha('#F87171', 0.16),
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F87171' },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#F87171', letterSpacing: 0.5 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4 },
  formLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, marginRight: 4 },
});
