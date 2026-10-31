import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PeopleIcon, StarIcon } from '@/components/icons';
import { cardHeight, TeamCard } from '@/components/team-card';
import { IconButton, LoadingState, ScreenHeader } from '@/components/ui';
import { useTeam, useTeamDetail } from '@/hooks/queries';
import { useTilt } from '@/hooks/use-tilt';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state/team-store';

export default function Home() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { currentTeamId, favoriteTeamId, setFavorite } = useTeamStore();
  const team = useTeam(currentTeamId);
  const { data: detail } = useTeamDetail(currentTeamId);
  const theme = teamTheme(team);

  const cardWidth = Math.round(Math.min(width * 0.78, 360, (height - insets.top - insets.bottom - 230) / 1.4));
  const tilt = useTilt({ width: cardWidth, height: cardHeight(cardWidth) });

  // Background color glides between teams instead of snapping.
  const bg = useSharedValue<string>(theme.background);
  useEffect(() => {
    bg.value = withTiming(theme.background, { duration: 500 });
  }, [theme.background, bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));

  // Giant team letters behind the card drift opposite the tilt for depth.
  const lettersStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -tilt.x.value * 18 }, { translateY: -tilt.y.value * 12 }],
  }));

  const isFavorite = !!team && team.id === favoriteTeamId;

  if (!team) {
    return (
      <View style={[styles.root, { backgroundColor: palette.arena }]}>
        <LoadingState label="Loading your team" />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <Animated.Text
        key={`letters-${team.id}`}
        entering={FadeIn.duration(600)}
        style={[
          styles.letters,
          { color: withAlpha(theme.accent, 0.09), fontSize: width * 0.62, top: height * 0.2 },
          lettersStyle,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {team.abbreviation}
      </Animated.Text>

      <ScreenHeader
        right={
          <IconButton
            label={isFavorite ? 'Your favorite team' : `Make the ${team.name} your favorite`}
            onPress={() => {
              if (isFavorite) return;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setFavorite(team.id);
            }}>
            <StarIcon color={isFavorite ? theme.accent : palette.chalk} filled={isFavorite} />
          </IconButton>
        }
      />

      <View style={styles.stage}>
        {/* Changing the key re-mounts the card, which plays its deal-in animation. */}
        <TeamCard key={team.id} team={team} detail={detail} width={cardWidth} tilt={tilt} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.splits}>
          <Split label="Home" value={detail?.homeRecord} />
          <Split label="Away" value={detail?.awayRecord} />
          <Split label="Arena" value={detail?.venue} wide />
        </View>

        <Pressable
          onPress={() => router.navigate('/roster')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.rosterButton,
            { backgroundColor: withAlpha('#FFFFFF', pressed ? 0.16 : 0.09), borderColor: withAlpha(theme.accent, 0.4) },
          ]}>
          <PeopleIcon color={palette.chalk} />
          <Text style={styles.rosterText}>See the roster</Text>
        </Pressable>

        {!tilt.sensorAvailable && <Text style={styles.hint}>No motion sensor found. Drag the card to tilt it.</Text>}
      </View>
    </Animated.View>
  );
}

function Split({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <View style={wide ? { flex: 1 } : undefined}>
      <Text style={styles.splitLabel}>{label}</Text>
      <Text style={styles.splitValue} numberOfLines={1}>
        {value ?? '–'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  letters: {
    position: 'absolute',
    left: -10,
    right: -10,
    textAlign: 'center',
    fontFamily: 'BigShouldersDisplay_900Black',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 16,
  },
  splits: {
    flexDirection: 'row',
    gap: 24,
  },
  splitLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
  },
  splitValue: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: palette.chalk,
  },
  rosterButton: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  rosterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.chalk,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
  },
});
