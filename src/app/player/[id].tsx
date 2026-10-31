import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/components/icons';
import { LoadingState } from '@/components/ui';
import { usePlayerStats, useRoster, useTeam } from '@/hooks/queries';
import { useTilt } from '@/hooks/use-tilt';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';

const MAX_ROTATE = 10;

export default function PlayerScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id, teamId } = useLocalSearchParams<{ id: string; teamId: string }>();
  const team = useTeam(teamId);
  const { data: roster } = useRoster(teamId);
  const theme = teamTheme(team);

  const player = roster?.players.find((p) => p.id === id);
  const { data: stats } = usePlayerStats(player?.id);

  const cardWidth = Math.min(width * 0.82, 340);
  const cardHeight = Math.round(cardWidth * 1.38);
  const tilt = useTilt({ width: cardWidth, height: cardHeight });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${tilt.x.value * MAX_ROTATE}deg` },
      { rotateX: `${-tilt.y.value * MAX_ROTATE}deg` },
    ],
  }));

  const jerseyParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: tilt.x.value * 18 },
      { translateY: tilt.y.value * 10 },
    ],
  }));

  const headshotParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: tilt.x.value * 8 },
      { translateY: tilt.y.value * 5 },
    ],
  }));

  if (!player) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <LoadingState label="Loading player" />
      </View>
    );
  }

  const infoRows: [string, string][] = [
    player.positionName ? ['Position', player.positionName] : null,
    player.age != null ? ['Age', String(player.age)] : null,
    player.height ? ['Height', player.height] : null,
    player.weight ? ['Weight', player.weight] : null,
    player.experience != null
      ? ['Experience', player.experience === 0 ? 'Rookie' : `${player.experience} yr${player.experience !== 1 ? 's' : ''}`]
      : null,
    player.college ? ['College', player.college] : null,
  ].filter((r): r is [string, string] => r !== null);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Back button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={14}
          style={[styles.backBtn, { backgroundColor: withAlpha(theme.primary, 0.18) }]}>
          <ArrowLeftIcon color={theme.accent} size={20} />
        </Pressable>
      </View>

      {/* Tilt card */}
      <View style={styles.cardArea}>
        <GestureDetector gesture={tilt.gesture}>
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[
              styles.card,
              { width: cardWidth, height: cardHeight, backgroundColor: theme.primary },
              cardStyle,
            ]}>

            {/* Jersey number ghost */}
            {player.jersey && (
              <Animated.Text
                style={[
                  styles.jerseyGhost,
                  {
                    color: withAlpha(theme.onPrimary, 0.09),
                    fontSize: cardWidth * 0.88,
                    lineHeight: cardWidth * 0.88,
                  },
                  jerseyParallax,
                ]}
                accessibilityElementsHidden>
                {player.jersey}
              </Animated.Text>
            )}

            {/* Headshot */}
            <Animated.View style={[styles.headshotContainer, headshotParallax]}>
              {player.headshot ? (
                <Image
                  source={player.headshot}
                  style={{ width: cardWidth * 0.72, height: cardWidth * 0.78 }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.initialsCircle,
                    {
                      width: cardWidth * 0.52,
                      height: cardWidth * 0.52,
                      borderRadius: cardWidth * 0.26,
                      backgroundColor: withAlpha(theme.onPrimary, 0.12),
                    },
                  ]}>
                  <Text style={[styles.initialsText, { color: theme.onPrimary, fontSize: cardWidth * 0.2 }]}>
                    {player.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Card footer */}
            <View style={styles.cardFooter}>
              {player.jersey && (
                <Text style={[styles.cardJerseyLabel, { color: withAlpha(theme.onPrimary, 0.5) }]}>
                  #{player.jersey}
                </Text>
              )}
              <Text
                style={[styles.cardName, { color: theme.onPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {player.name}
              </Text>
              {player.positionName && (
                <Text style={[styles.cardPosition, { color: withAlpha(theme.onPrimary, 0.65) }]}>
                  {player.positionName}
                </Text>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Details scrollview */}
      <ScrollView
        contentContainerStyle={[styles.detailsContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>

        {stats && Object.values(stats).some((v) => v != null) && (
          <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.statsBlock}>
            <Text style={styles.sectionLabel}>This season</Text>
            <View style={styles.statsGrid}>
              {([
                { key: 'PPG', val: stats.ppg },
                { key: 'RPG', val: stats.rpg },
                { key: 'APG', val: stats.apg },
                { key: 'SPG', val: stats.spg },
                { key: 'BPG', val: stats.bpg },
                { key: 'MPG', val: stats.mpg },
              ] as { key: string; val: number | undefined }[])
                .filter(({ val }) => val != null)
                .map(({ key, val }) => (
                  <View key={key} style={[styles.statCell, { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
                    <Text style={[styles.statValue, { color: theme.accent }]}>{val!.toFixed(1)}</Text>
                    <Text style={styles.statKey}>{key}</Text>
                  </View>
                ))}
            </View>
            {(stats.fgPct != null || stats.threePct != null || stats.ftPct != null) && (
              <View style={[styles.infoCard, { backgroundColor: withAlpha('#FFFFFF', 0.06), marginTop: 8 }]}>
                {([
                  { label: 'FG%', val: stats.fgPct },
                  { label: '3P%', val: stats.threePct },
                  { label: 'FT%', val: stats.ftPct },
                ] as { label: string; val: number | undefined }[])
                  .filter(({ val }) => val != null)
                  .map(({ label, val }, i, arr) => (
                    <View key={label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
                      <Text style={styles.infoLabel}>{label}</Text>
                      <Text style={styles.infoValue}>{(val! * 100).toFixed(1)}%</Text>
                    </View>
                  ))}
              </View>
            )}
          </Animated.View>
        )}

        {infoRows.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(120).duration(300)}
            style={[styles.infoCard, { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
            {infoRows.map(([label, value], i) => (
              <View key={label} style={[styles.infoRow, i < infoRows.length - 1 && styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArea: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  jerseyGhost: {
    position: 'absolute',
    fontFamily: fonts.display,
    right: -24,
    bottom: 56,
  },
  headshotContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  initialsCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: fonts.display,
  },
  cardFooter: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 1,
  },
  cardJerseyLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 1,
  },
  cardName: {
    fontFamily: fonts.display,
    fontSize: 36,
  },
  cardPosition: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  detailsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statsBlock: {
    gap: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    flex: 1,
    minWidth: 72,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 28,
  },
  statKey: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: palette.muted,
    letterSpacing: 0.5,
  },
  infoCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha(palette.chalk, 0.1),
  },
  infoLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
  },
  infoValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: palette.chalk,
  },
});
