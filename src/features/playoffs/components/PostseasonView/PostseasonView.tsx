import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bracket } from '../Bracket';
import { CupIcon , ErrorState, ListSkeleton } from '@/components';
import { usePostseason , useRefresh } from '@/hooks';
import { buildPlayIn, buildPlayoffs, seedMap, type Series } from '@/lib/league';
import { currentSeason, seasonLabel } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { openDetail } from '@/navigation';

const GOLD = '#FBBF24';

/** The playoff bracket for a season, with the champion on top once the Finals are decided. */
export function PlayoffsView({ season }: { season: number }) {
  return <PostseasonPane season={season} kind="playoffs" />;
}

/** The play-in games for a season: three single games per conference. */
export function PlayInView({ season }: { season: number }) {
  return <PostseasonPane season={season} kind="playin" />;
}

function PostseasonPane({ season, kind }: { season: number; kind: 'playoffs' | 'playin' }) {
  const insets = useSafeAreaInsets();
  const { favoriteTeamId } = useTeamStore();
  const { data, isPending, error, refetch } = usePostseason(season);
  const refreshControl = useRefresh([['postseason', season]]);

  if (isPending) return <ListSkeleton count={8} avatar="square" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Failed to load'} onRetry={refetch} />;

  const seeds = seedMap(data.standings);
  const upcoming = season === currentSeason();
  const playoffs = kind === 'playoffs' ? buildPlayoffs(data.playoffs, seeds) : null;
  const playIn = kind === 'playin' ? buildPlayIn(data.playIn, seeds) : null;
  const finals: Series | undefined = playoffs?.rounds.find((r) => r.key === 'finals')?.series[0];
  const champion = finals?.winnerId ? (finals.winnerId === finals.top.teamId ? finals.top : finals.bottom) : null;

  return (
    <ScrollView
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24 }}>
      {champion && finals && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            onPress={() => openDetail(`/team/${champion.teamId}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={`${seasonLabel(season)} NBA champions: ${champion.abbr}`}
            style={styles.champion}>
            <CupIcon color={GOLD} size={28} />
            {champion.logo ? <Image source={champion.logo} style={styles.championLogo} contentFit="contain" /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.championLabel}>{seasonLabel(season)} NBA champions</Text>
              <Text style={styles.championName}>{champion.abbr}</Text>
            </View>
            <Text style={styles.championScore}>{finals.status.replace(/^\S+ wins /, '')}</Text>
          </Pressable>
        </Animated.View>
      )}

      <Bracket
        rounds={playoffs ? playoffs.rounds : playIn ? [playIn] : []}
        sections={playoffs ? playoffs.sections : playIn ? [{ title: 'Play-In', rounds: [playIn] }] : []}
        favoriteTeamId={favoriteTeamId}
        emptyText={
          upcoming
            ? kind === 'playoffs'
              ? 'The playoffs start in April. The bracket appears here once the first series is set.'
              : 'The play-in tournament is played in mid-April, after the regular season.'
            : 'No games found for this season.'
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  champion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: withAlpha(GOLD, 0.1), borderWidth: 1, borderColor: withAlpha(GOLD, 0.35), marginBottom: 16 },
  championLogo: { width: 44, height: 44 },
  championLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: GOLD },
  championName: { fontFamily: fonts.display, fontSize: 32, color: palette.chalk },
  championScore: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
});
