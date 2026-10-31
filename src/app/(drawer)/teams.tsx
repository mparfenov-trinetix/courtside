import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon, StarIcon } from '@/components/icons';
import { ErrorState, LoadingState, ScreenHeader } from '@/components/ui';
import { useTeams } from '@/hooks/queries';
import type { Team } from '@/lib/espn';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state/team-store';

export default function Teams() {
  const insets = useSafeAreaInsets();
  const { data: teams, isPending, error, refetch } = useTeams();
  const { currentTeamId, favoriteTeamId, viewTeam } = useTeamStore();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = (teams ?? []).filter(
    (t) => !q || t.displayName.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q),
  );

  const open = (team: Team) => {
    Haptics.selectionAsync();
    viewTeam(team.id);
    router.navigate('/home');
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="All teams" />
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by city, name or abbreviation"
          placeholderTextColor={palette.muted}
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {isPending ? (
        <LoadingState label="Loading teams" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
          ListEmptyComponent={<Text style={styles.empty}>No team matches “{query}”.</Text>}
          renderItem={({ item, index }) => (
            <TeamRow
              team={item}
              index={index}
              current={item.id === currentTeamId}
              favorite={item.id === favoriteTeamId}
              onPress={() => open(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function TeamRow({
  team,
  index,
  current,
  favorite,
  onPress,
}: {
  team: Team;
  index: number;
  current: boolean;
  favorite: boolean;
  onPress: () => void;
}) {
  const theme = teamTheme(team);
  return (
    <Animated.View entering={FadeInRight.delay(Math.min(index, 12) * 30).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${team.displayName}${current ? ', showing now' : ''}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? withAlpha(theme.primary, 0.35) : withAlpha('#FFFFFF', 0.05),
            borderColor: current ? withAlpha(theme.accent, 0.6) : 'transparent',
          },
        ]}>
        <View style={[styles.swatch, { backgroundColor: theme.primary }]}>
          <View style={[styles.swatchStripe, { backgroundColor: theme.secondary }]} />
        </View>
        <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.location}>{team.location}</Text>
          <Text style={styles.name}>{team.name}</Text>
        </View>
        {favorite && <StarIcon size={18} color={theme.accent} filled />}
        <Text style={styles.abbr}>{team.abbreviation}</Text>
        <ChevronIcon color={palette.muted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  search: {
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    backgroundColor: withAlpha('#FFFFFF', 0.07),
    color: palette.chalk,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 68,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  swatch: {
    width: 8,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  swatchStripe: {
    height: '35%',
  },
  logo: {
    width: 40,
    height: 40,
  },
  location: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: palette.chalk,
    marginTop: -2,
  },
  abbr: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: palette.muted,
    width: 34,
    textAlign: 'right',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
  },
});
