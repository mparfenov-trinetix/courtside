import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EdgeFade, LogoWatermark, Pill, Skeleton, SkeletonGroup } from '@/components';
import { usePlayerStats } from '@/hooks';
import type { Player, PlayerSeasonStats, Team } from '@/lib/espn';
import { formatCategory } from '@/lib/league';
import { fonts, withAlpha, type TeamTheme } from '@/lib/theme';

/** The two rows of season numbers on a card: label and where the number is. */
const HEADLINE = [
  { key: 'ppg', label: 'PTS' },
  { key: 'rpg', label: 'REB' },
  { key: 'apg', label: 'AST' },
  { key: 'spg', label: 'STL' },
  { key: 'bpg', label: 'BLK' },
] as const;
const SHOOTING = [
  { key: 'mpg', label: 'MIN' },
  { key: 'fgPct', label: 'FG%' },
  { key: 'threePct', label: '3P%' },
  { key: 'ftPct', label: 'FT%' },
  { key: 'gamesStarted', label: 'GS' },
] as const;

const shown = (key: keyof PlayerSeasonStats, stats: PlayerSeasonStats | undefined): string => {
  const v = stats?.[key];
  if (v == null || Number.isNaN(v)) return '–';
  if (key === 'fgPct' || key === 'threePct' || key === 'ftPct') return formatCategory(key, v);
  if (key === 'gamesStarted') return String(Math.round(v));
  return v.toFixed(1);
};

/**
 * One player as a big trading card for the Cards view: the team's color with its logo faint behind him, his photo melting into the footer,
 * his number big and faint, name, build and age, ten season numbers (the card reads them itself when `near`, so only the card on screen and its
 * neighbours ask ESPN) and what the roster says of him: school, where he was born, seasons in the league. A tap opens his page.
 */
export function RosterPlayerCard({
  player,
  team,
  theme,
  width,
  height,
  near,
  onPress,
}: {
  player: Player;
  team: Team;
  theme: TeamTheme;
  width: number;
  height: number;
  near: boolean;
  onPress: () => void;
}) {
  const { data: stats, isPending } = usePlayerStats(near ? player.id : undefined);
  const loading = near && isPending;
  const photoW = width * 0.92;
  const photoH = photoW * (254 / 350);
  const logoSize = width * 0.78;
  const Stats = loading ? SkeletonGroup : View;
  const facts = [
    player.born ? { label: 'Born', value: [new Date(`${player.born}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), player.country].filter(Boolean).join(' · ') } : null,
    player.experience != null ? { label: 'League', value: player.experience === 0 ? 'Rookie' : `${player.experience} season${player.experience === 1 ? '' : 's'}` } : null,
  ].filter((f): f is { label: string; value: string } => f != null);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, number ${player.jersey ?? 'unknown'}, ${player.positionName ?? ''}. Open the player page`}
      style={({ pressed }) => [styles.card, { width, height, backgroundColor: theme.primary }, pressed && { opacity: 0.92 }]}>
      <LogoWatermark team={team} onColor={theme.onPrimary} size={logoSize} style={{ position: 'absolute', left: (width - logoSize) / 2, top: width * 0.04 }} />



      {player.headshot ? (
        <View style={[styles.photo, { width: photoW, height: photoH, left: (width - photoW) / 2, top: height * 0.06 }]}>
          <Image source={player.headshot} style={StyleSheet.absoluteFill} contentFit="cover" priority="high" cachePolicy="memory-disk" />
          <EdgeFade color={theme.primary} />
        </View>
      ) : null}

      {/* After the photo: its edge fade is painted in the card color and would wipe out the part of the number under it. */}
      {player.jersey ? (
        <Text pointerEvents="none" style={[styles.number, { color: withAlpha(theme.onPrimary, 0.16), fontSize: width * (player.jersey.length < 2 ? 0.6 : 0.46), lineHeight: width * (player.jersey.length < 2 ? 0.6 : 0.46) }]}>
          {player.jersey}
        </Text>
      ) : null}

      {/* Drawn after the photo, which would otherwise cover the lower half of the pills. */}
      <View style={styles.tags}>
        {player.position ? <Pill on={theme.onPrimary}>{player.position}</Pill> : null}
        {player.injury ? <Pill tone={/^out/i.test(player.injury) ? 'loss' : 'gold'} style={styles.darkPill}>{/^out/i.test(player.injury) ? 'OUT' : 'DTD'}</Pill> : null}
      </View>

      <View style={styles.footer}>
        <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />
        <Text style={[styles.name, { color: theme.onPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
          {player.name}
        </Text>
        <View style={styles.pills}>
          {player.height ? <Pill on={theme.onPrimary}>{player.height}</Pill> : null}
          {player.weight ? <Pill on={theme.onPrimary}>{player.weight}</Pill> : null}
          {player.age != null ? <Pill on={theme.onPrimary}>{`${player.age} yrs`}</Pill> : null}
        </View>

        {[HEADLINE, SHOOTING].map((row, r) => (
          <Stats key={r} style={[styles.stats, r > 0 && styles.statsSecond]}>
            {row.map((s, i) => (
              <View key={s.key} style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: withAlpha(theme.onPrimary, 0.3) }]}>
                {loading ? (
                  <Skeleton width={28} height={r === 0 ? 20 : 15} radius={5} style={{ backgroundColor: withAlpha(theme.onPrimary, 0.2), marginVertical: 2 }} />
                ) : (
                  <Text style={[r === 0 ? styles.value : styles.valueSmall, { color: theme.onPrimary }]}>{shown(s.key, stats)}</Text>
                )}
                <Text style={[styles.key, { color: withAlpha(theme.onPrimary, 0.6) }]}>{s.label}</Text>
              </View>
            ))}
          </Stats>
        ))}

        {facts.length > 0 ? (
          <View style={[styles.facts, { borderTopColor: withAlpha(theme.onPrimary, 0.22) }]}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact}>
                <Text style={[styles.factLabel, { color: withAlpha(theme.onPrimary, 0.6) }]}>{f.label}</Text>
                <Text style={[styles.factValue, { color: theme.onPrimary }]} numberOfLines={1}>
                  {f.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, { borderColor: withAlpha(theme.edge, 0.5) }]} />
    </Pressable>
  );
}

const RADIUS = 24;
const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, overflow: 'hidden', justifyContent: 'flex-end' },
  number: { position: 'absolute', top: 4, right: 16, fontFamily: fonts.display },
  // On a dark base so the status reads on every team color (red on a red or yellow card vanishes).
  darkPill: { backgroundColor: 'rgba(10,10,10,0.7)' },
  tags: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  photo: { position: 'absolute' },
  footer: { paddingHorizontal: 16, paddingBottom: 14 },
  stripe: { width: 28, height: 4, borderRadius: 2, marginBottom: 6 },
  name: { fontFamily: fonts.display, fontSize: 32, lineHeight: 35 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 10 },
  stats: { flexDirection: 'row' },
  statsSecond: { marginTop: 8 },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },
  valueSmall: { fontFamily: fonts.display, fontSize: 18, lineHeight: 20, opacity: 0.9 },
  key: { fontFamily: fonts.bodySemi, fontSize: 9, letterSpacing: 0.7 },
  facts: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, gap: 4 },
  fact: { flexDirection: 'row', gap: 10 },
  factLabel: { width: 52, fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', paddingTop: 1 },
  factValue: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14 },
  edge: { borderRadius: RADIUS, borderWidth: 1.5 },
});
