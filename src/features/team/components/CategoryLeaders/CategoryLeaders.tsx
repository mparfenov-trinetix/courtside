import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Expandable, SectionLabel, Skeleton, SkeletonGroup } from '@/components';
import type { Player, PlayerSeasonStats } from '@/lib/espn';
import { barShare, formatCategory, rankByCategory, ROSTER_CATEGORIES, type RosterCategoryKey } from '@/lib/league';
import { fonts, palette, withAlpha, type TeamTheme } from '@/lib/theme';

const COLLAPSED = 7;

/** The roster ranked by whatever you pick: a season number (points, rebounds, shooting, starts) or a fact (age, seasons in the league, height, weight). */
export function CategoryLeaders({
  players,
  statsOf,
  loading,
  theme,
  onOpen,
}: {
  players: Player[];
  statsOf: (id: string) => PlayerSeasonStats | undefined;
  /** Season numbers are still arriving. */
  loading: boolean;
  theme: TeamTheme;
  onOpen: (player: Player) => void;
}) {
  const [key, setKey] = useState<RosterCategoryKey>('ppg');
  const [all, setAll] = useState(false);
  const category = ROSTER_CATEGORIES.find((c) => c.key === key) ?? ROSTER_CATEGORIES[0]!;
  const ranked = rankByCategory(players, statsOf, key);
  const waiting = category.source === 'stats' && loading && ranked.length === 0;
  const max = ranked[0]?.value ?? 0;
  const head = ranked.slice(0, COLLAPSED);
  const rest = ranked.slice(COLLAPSED);

  const rowOf = ({ player, value }: { player: Player; value: number }, i: number) => (
    <Pressable
      key={player.id}
      onPress={() => onOpen(player)}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, ${formatCategory(key, value)}`}
      style={({ pressed }) => [styles.row, i > 0 && styles.rowNext, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.rank, i === 0 && { color: theme.accent }]}>{i + 1}</Text>
      <View style={[styles.face, { backgroundColor: withAlpha(theme.primary, 0.7) }]}>
        {player.headshot ? <Image source={player.headshot} style={styles.photo} contentFit="cover" /> : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { flex: barShare(value, max), backgroundColor: i === 0 ? theme.brand : withAlpha(theme.brand, 0.55) }]} />
          <View style={{ flex: 1 - barShare(value, max) }} />
        </View>
      </View>
      <Text style={[styles.value, i === 0 && { color: theme.accent }]}>{formatCategory(key, value)}</Text>
    </Pressable>
  );

  return (
    <View>
      <SectionLabel style={styles.label}>Players by category</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        {ROSTER_CATEGORIES.map((c) => (
          <Chip key={c.key} active={c.key === key} onPress={() => setKey(c.key)} label={c.label} color={theme.accent} />
        ))}
      </ScrollView>
      <Card style={styles.card}>
        <Text style={styles.title}>{category.title}</Text>
        {waiting ? (
          <SkeletonGroup style={{ gap: 12, marginTop: 6 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} height={34} radius={10} />
            ))}
          </SkeletonGroup>
        ) : ranked.length === 0 ? (
          <Text style={styles.empty}>No numbers for this yet.</Text>
        ) : (
          <View>
            {head.map((r, i) => rowOf(r, i))}
            {/* The rows past the first seven open and close by animating their height, exactly as the head to head's list does: the card follows
                frame by frame (what is under it moves with it) and a second tap mid-way just turns it round. */}
            {rest.length > 0 ? <Expandable open={all}>{rest.map((r, i) => rowOf(r, COLLAPSED + i))}</Expandable> : null}
          </View>
        )}
        {ranked.length > COLLAPSED ? (
          <Pressable onPress={() => setAll((a) => !a)} accessibilityRole="button" hitSlop={8} style={styles.more}>
            <Text style={[styles.moreText, { color: theme.accent }]}>{all ? 'Show fewer' : `Show all ${ranked.length}`}</Text>
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, paddingHorizontal: 4 },
  chipScroll: { flexGrow: 0, marginHorizontal: -16 },
  chips: { paddingHorizontal: 16, gap: 6, paddingBottom: 10 },
  card: { gap: 10, padding: 14 },
  title: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  empty: { fontFamily: fonts.body, fontSize: 14, color: palette.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // The gap between rows is a top margin, so a closed Expandable between two of them adds none.
  rowNext: { marginTop: 10 },
  rank: { width: 18, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, color: palette.muted },
  face: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: 46, height: 36 },
  name: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', backgroundColor: withAlpha(palette.chalk, 0.08) },
  fill: { borderRadius: 3 },
  value: { minWidth: 58, textAlign: 'right', fontFamily: fonts.display, fontSize: 20, color: palette.chalk },
  more: { alignSelf: 'center', paddingVertical: 4 },
  moreText: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
