import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NbaLogo, ErrorState, OutlinedLogo, Skeleton, SkeletonGroup } from '@/components';
import { useTeams } from '@/hooks';
import type { Team } from '@/lib/espn';
import { fonts, logoOn, OUTLINED_LOGO, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { COLUMNS, GAP, PADDING } from './constants';

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: teams, isPending, error, refetch } = useTeams();
  const { favoriteTeamId, setFavorite } = useTeamStore();
  const [selectedId, setSelectedId] = useState<string | null>(favoriteTeamId);
  // The button says "Keep" for the team that was yours when the screen opened. Reading the live favorite made the label flip to
  // "Keep" the instant you confirmed, while the screen was still on its way out.
  const [favoriteAtOpen] = useState(favoriteTeamId);

  const selected = teams?.find((t) => t.id === selectedId) ?? null;
  const theme = teamTheme(selected);
  const tileSize = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  // The whole screen washes toward the chosen team's color.
  const bg = useSharedValue<string>(palette.arena);
  useEffect(() => {
    bg.value = withTiming(selected ? theme.background : palette.arena, { duration: 450 });
  }, [selected, theme.background, bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));

  const confirm = () => {
    if (!selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFavorite(selected.id);
    // The picker is pushed over the app from the team card's star and the menu, so the app is still under it: go back to it.
    // `replace('/home')` mounted a second whole drawer (every screen, widget sync, queries) on top of the first on each change,
    // which is what made the app lag after a dozen quick changes. On a first launch there is nothing under the picker, and
    // `dismissTo` replaces it with the home card instead.
    router.dismissTo('/home');
  };

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      {isPending ? (
        <SkeletonGroup style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingTop: 120 }}>
          {Array.from({ length: 15 }, (_, i) => (
            <Skeleton key={i} width="30.5%" height={110} radius={20} />
          ))}
        </SkeletonGroup>
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          numColumns={COLUMNS}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            paddingHorizontal: PADDING,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 120,
            gap: GAP,
          }}
          ListHeaderComponent={
            <View style={styles.header}>
              <NbaLogo size={44} />
              <Text style={styles.title}>Pick your team</Text>
              <Text style={styles.subtitle}>It becomes your home card. You can switch any time from the menu.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TeamTile
              team={item}
              index={index}
              size={tileSize}
              selected={item.id === selectedId}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedId(item.id);
              }}
            />
          )}
        />
      )}

      {selected && (
        <Animated.View
          entering={FadeInDown.duration(260)}
          exiting={FadeOutDown}
          style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={confirm}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.primary, borderColor: withAlpha(theme.onPrimary, 0.25), opacity: pressed ? 0.85 : 1 },
            ]}>
            <OutlinedLogo source={logoOn(selected, theme.onPrimary)} size={32} outlined={OUTLINED_LOGO.has(selected.abbreviation)} />
            <Text style={[styles.ctaText, { color: theme.onPrimary }]} numberOfLines={1}>
              {selected.id === favoriteAtOpen ? `Keep the ${selected.name} as my team` : `Make the ${selected.name} my team`}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function TeamTile({
  team,
  index,
  size,
  selected,
  onPress,
}: {
  team: Team;
  index: number;
  size: number;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = teamTheme(team);
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    lift.value = withSpring(selected ? 1 : 0, { damping: 22, stiffness: 160 });
  }, [selected, lift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + lift.value * 0.06 }, { translateY: -lift.value * 4 }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 14) * 22).duration(280)} style={style}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={team.displayName}
        style={[
          styles.tile,
          {
            width: size,
            height: size * 1.12,
            backgroundColor: selected ? theme.primary : withAlpha('#FFFFFF', 0.06),
            borderColor: selected ? withAlpha(theme.onPrimary, 0.35) : 'transparent',
          },
        ]}>
        {/* On its own color a red logo (Houston) is red on red: it gets the white outline the team card gives it. */}
        <OutlinedLogo
          source={selected ? logoOn(team, theme.onPrimary) : team.logoDark || team.logo}
          size={size * 0.56}
          outlined={selected && OUTLINED_LOGO.has(team.abbreviation)}
        />
        <Text
          style={[styles.tileName, { color: selected ? theme.onPrimary : palette.chalk }]}
          numberOfLines={1}>
          {team.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    marginBottom: 12,
    gap: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 52,
    color: palette.chalk,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: palette.muted,
    maxWidth: 320,
  },
  tile: {
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileName: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  ctaWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
  },
  ctaText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
  },
});
