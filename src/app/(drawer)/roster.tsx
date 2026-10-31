import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState, ScreenHeader } from '@/components/ui';
import { useRoster, useTeam } from '@/hooks/queries';
import type { Player } from '@/lib/espn';
import { fonts, logoOn, palette, teamTheme, withAlpha, type TeamTheme } from '@/lib/theme';
import { useTeamStore } from '@/state/team-store';

export default function Roster() {
  const insets = useSafeAreaInsets();
  const { currentTeamId } = useTeamStore();
  const team = useTeam(currentTeamId);
  const theme = teamTheme(team);
  const { data, isPending, error, refetch } = useRoster(currentTeamId);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScreenHeader title={team ? `${team.name} roster` : 'Roster'} />

      {team && (
        <Animated.View key={team.id} entering={FadeIn} style={[styles.banner, { backgroundColor: theme.primary }]}>
          <Image source={logoOn(team, theme.onPrimary)} style={styles.bannerLogo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.onPrimary }]}>{team.displayName}</Text>
            <Text style={[styles.bannerSub, { color: withAlpha(theme.onPrimary, 0.75) }]}>
              {[data?.coach && `Head coach ${data.coach}`, data && `${data.players.length} players`]
                .filter(Boolean)
                .join(', ') || ' '}
            </Text>
          </View>
        </Animated.View>
      )}

      {isPending ? (
        <LoadingState label="Loading roster" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.players}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
          renderItem={({ item, index }) => (
            <PlayerRow
              player={item}
              index={index}
              theme={theme}
              open={openId === item.id}
              onPress={() => {
                Haptics.selectionAsync();
                setOpenId((id) => (id === item.id ? null : item.id));
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function PlayerRow({
  player,
  index,
  theme,
  open,
  onPress,
}: {
  player: Player;
  index: number;
  theme: TeamTheme;
  open: boolean;
  onPress: () => void;
}) {
  const details = [
    player.positionName && ['Position', player.positionName],
    player.age && ['Age', String(player.age)],
    player.experience !== undefined && ['Experience', player.experience === 0 ? 'Rookie' : `${player.experience} yrs`],
    player.college && ['College', player.college],
  ].filter(Boolean) as [string, string][];

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 10) * 35).springify().damping(18)}
      layout={LinearTransition.springify().damping(18)}
      style={[
        styles.row,
        { backgroundColor: open ? withAlpha(theme.primary, 0.55) : withAlpha('#FFFFFF', 0.05) },
      ]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${player.name}, number ${player.jersey ?? 'unknown'}, ${player.positionName ?? ''}`}
        style={styles.rowMain}>
        <Text style={[styles.jersey, { color: theme.accent }]}>{player.jersey ?? '–'}</Text>
        <View style={[styles.headshotWrap, { backgroundColor: withAlpha(theme.primary, 0.6) }]}>
          {player.headshot ? (
            <Image source={player.headshot} style={styles.headshot} contentFit="cover" transition={150} />
          ) : (
            <Text style={styles.initials}>
              {player.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[player.position, player.height, player.weight].filter(Boolean).join(', ')}
          </Text>
        </View>
      </Pressable>

      {open && details.length > 0 && (
        <Animated.View entering={FadeIn.duration(220)} style={styles.details}>
          {details.map(([label, value]) => (
            <View key={label} style={styles.detail}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bannerLogo: {
    width: 46,
    height: 46,
  },
  bannerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  bannerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  row: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    paddingRight: 14,
  },
  jersey: {
    width: 44,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 32,
  },
  headshotWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headshot: {
    width: 64,
    height: 52,
  },
  initials: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.chalk,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: palette.chalk,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
    marginTop: 1,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingLeft: 66,
    rowGap: 10,
    columnGap: 22,
  },
  detail: {
    minWidth: 90,
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: withAlpha(palette.chalk, 0.6),
  },
  detailValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: palette.chalk,
  },
});
