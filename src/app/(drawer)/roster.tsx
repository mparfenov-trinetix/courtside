import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
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

  const navigateToPlayer = (player: Player) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/player/[id]', params: { id: player.id, teamId: currentTeamId ?? '' } });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScreenHeader title={team ? `${team.name} roster` : 'Roster'} />

      {team && (
        <Animated.View key={team.id} entering={FadeIn} style={[styles.banner, { backgroundColor: theme.primary }]}>
          <Image source={logoOn(team, theme.onPrimary)} style={styles.bannerLogo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.onPrimary }]}>{team.displayName}</Text>
            <Text style={[styles.bannerSub, { color: withAlpha(theme.onPrimary, 0.75) }]}>
              {data ? `${data.players.length} players` : ' '}
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
          ListHeaderComponent={
            data?.coach ? <CoachRow coach={data.coach} theme={theme} /> : undefined
          }
          renderItem={({ item, index }) => (
            <PlayerRow
              player={item}
              index={index}
              theme={theme}
              onPress={() => navigateToPlayer(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function CoachRow({ coach, theme }: { coach: string; theme: TeamTheme }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}
      layout={LinearTransition.duration(200)}
      style={[styles.coachRow, { backgroundColor: withAlpha(theme.primary, 0.3) }]}>
      <View style={[styles.coachIcon, { backgroundColor: withAlpha(theme.accent, 0.18) }]}>
        <Text style={[styles.coachInitial, { color: theme.accent }]}>
          {coach.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View>
        <Text style={styles.coachLabel}>Head Coach</Text>
        <Text style={styles.coachName}>{coach}</Text>
      </View>
    </Animated.View>
  );
}

function PlayerRow({
  player,
  index,
  theme,
  onPress,
}: {
  player: Player;
  index: number;
  theme: TeamTheme;
  onPress: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 12) * 25).duration(280).easing(Easing.out(Easing.cubic))}
      layout={LinearTransition.duration(200)}
      style={[styles.row, { backgroundColor: withAlpha('#FFFFFF', 0.05) }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${player.name}, number ${player.jersey ?? 'unknown'}, ${player.positionName ?? ''}`}
        style={({ pressed }) => [
          styles.rowMain,
          pressed && { backgroundColor: withAlpha(theme.primary, 0.25) },
        ]}>
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
        <View style={styles.chevron}>
          <Text style={{ color: palette.muted, fontSize: 18 }}>›</Text>
        </View>
      </Pressable>
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
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  coachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitial: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  coachLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
    marginBottom: 1,
  },
  coachName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.chalk,
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
    paddingRight: 12,
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
  chevron: {
    paddingLeft: 4,
  },
});
