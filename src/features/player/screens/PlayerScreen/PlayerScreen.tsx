import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, type Href } from 'expo-router';

import { useState } from 'react';

import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import Animated, { Easing, useAnimatedScrollHandler, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { ArrowLeftIcon, Card, EmptyState, GlassButton } from '@/components';

import { useAfterSettle, useAllStars, usePlayerBio, usePlayerCareer, usePlayerGameLog, usePlayerProfile, useInjuries, usePlayerStats, useRefresh, useRoster, useTeam } from '@/hooks';

import { cupSeasons, nba2kRating, titleSeasons } from '@/lib/league';

import { fonts, palette, teamTheme, withAlpha, textStyle } from '@/lib/theme';
import { goBack, pushOnce } from '@/navigation';

import { useWatchlist } from '@/state';

import {
  CareerSkeleton,
  CareerTable,
  ContractCard,
  FormCard,
  GameLog,
  GameLogSkeleton,
  HonorsCard,
  InfoSkeleton,
  PlayerCard,
  PlayerHighlights,
  PlayerPageSkeleton,
  PlayerShotChart,
  PlayerTopBar,
  RatingCard,
  SplitsCard,
  StatsSkeleton,
  careerAverages,
  playerCardSize,
  useLeagueRanks,
} from '../../components';


/** "2003-05-26" -> "May 26, 2003". Parsed by hand so the time zone can't shift the day. */
function formatBorn(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1] ?? ''} ${d}, ${y}`;
}

type Tab = 'season' | 'career' | 'games' | 'info';

export function PlayerScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id, teamId: linkedTeamId } = useLocalSearchParams<{ id: string; teamId: string }>();
  // The link carries the team he played for in the game, season or list it came from. He may have moved since, or
  // not be on any roster (retired, never signed): his athlete record answers those.
  const linked = useRoster(linkedTeamId);
  const [picked, setActiveTab] = useState<Tab | null>(null);
  const listed = linked.data?.players.find((p) => p.id === id);
  // Also read on the Info tab, for where he was born and his nationality (the roster doesn't carry them).
  // The league-wide injury report (one cached read, the Wire screen's): is he on it, and how badly.
  const injuries = useInjuries();
  const injury = injuries.data?.flatMap((t) => t.injuries).find((p) => p.id === id);
  const bio = usePlayerBio(picked === 'info' || (!listed && (!linkedTeamId || linked.isSuccess || linked.isError)) ? id : undefined);
  const teamId = listed ? linkedTeamId : (bio.data?.teamId ?? undefined);
  const { data: currentRoster } = useRoster(!listed && bio.data?.active ? teamId : undefined);
  // The roster entry has the fuller details (born, college); the athlete record covers everyone else.
  const rosterPlayer = listed ?? currentRoster?.players.find((p) => p.id === id);
  const player = rosterPlayer ?? bio.data?.player;
  const onRoster = !!rosterPlayer || (!!bio.data?.active && !currentRoster);
  const team = useTeam(teamId);
  const theme = teamTheme(team);
  // Someone with no current season opens on his career instead of an empty Season tab.
  const activeTab: Tab = picked ?? (onRoster ? 'season' : 'career');
  const { isWatched, toggle } = useWatchlist();

  // The league ranks and the All-Star list are extras: read once the page has settled. The honors and the career (for the card's badges
  // and, for a retired player, its numbers) start with the page, so the badges do not arrive late; they are cached and persisted.
  const settled = useAfterSettle(1200);
  const { data: stats, isPending: statsPending } = usePlayerStats(player?.id);
  const rating2k = nba2kRating(player?.name);
  const { data: gameLog, isPending: logPending } = usePlayerGameLog(player?.id);
  const { data: career, isPending: careerPending } = usePlayerCareer(player?.id);
  // Read ahead once settled, so the Info tab opens with the All-Star count instead of waiting for it.
  const { data: allStars } = useAllStars(activeTab === 'info' || settled);
  const { data: profile, isPending: profilePending } = usePlayerProfile(player?.id);
  const ranks = useLeagueRanks(player?.id, settled);
  // A retired player's pages are history; only someone still on a roster has numbers that move.
  const refreshControl = useRefresh([['playerStats', id], ['playerGameLog', id], ['playerCareer', id], ['roster', teamId], ['playerBio', id]], onRoster);

  // The card's numbers: this season's, or for someone with no current season (retired, unsigned) his career averages, named as such.
  const hasSeason = !!stats && Object.values(stats).some((v) => v != null);
  const careerStats = career ? careerAverages(career.career) : null;
  const showingCareer = !hasSeason && !!careerStats;
  const cardStats = hasSeason ? stats : (careerStats ?? undefined);
  const cardLoading = statsPending || (!hasSeason && careerPending);

  const { width: cardWidth, height: cardHeight } = playerCardSize(width);
  const scrollY = useSharedValue(0);
  // The compact header (photo, name, season line) takes over the top bar once the card has mostly scrolled away, and goes only when
  // you are back almost at the top, so scrolling up does not make it vanish while the card is still half off screen.
  const compactShown = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
    if (e.contentOffset.y > cardHeight * 0.75) compactShown.set(1);
    else if (e.contentOffset.y < cardHeight * 0.4) compactShown.set(0);
  });
  const compactProgress = useDerivedValue(() => withTiming(compactShown.get(), { duration: 240, easing: Easing.out(Easing.cubic) }));

  if (!player && bio.isError) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <GlassButton onPress={goBack} label="Go back" hitSlop={14} tint={withAlpha(theme.primary, 0.5)} fallbackColor={withAlpha(theme.primary, 0.18)}>
            <ArrowLeftIcon color={theme.accent} size={20} />
          </GlassButton>
        </View>
        <View style={styles.unavailable}>
          <Text style={styles.unavailableTitle}>Couldn’t load player</Text>
          <Text style={styles.unavailableText}>Check your connection and open the player again.</Text>
        </View>
      </View>
    );
  }
  if (!player) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 10 }]}>
        <PlayerPageSkeleton cardWidth={cardWidth} />
      </View>
    );
  }

  const infoRows: [string, string][] = [
    player.positionName ? ['Position', player.positionName] : null,
    player.born
      ? ['Born', `${formatBorn(player.born)}${player.age != null ? ` · ${player.age} yrs` : ''}`]
      : player.age != null
        ? ['Age', String(player.age)]
        : null,
    player.height ? ['Height', `${player.height}${player.heightCm ? ` · ${player.heightCm} cm` : ''}`] : null,
    player.weight ? ['Weight', `${player.weight}${player.weightKg ? ` · ${player.weightKg} kg` : ''}`] : null,
    player.experience != null
      ? ['Experience', player.experience === 0 ? 'Rookie' : `${player.experience} yr${player.experience !== 1 ? 's' : ''}`]
      : null,
    player.college ? ['College', player.college] : null,
    bio.data?.birthPlace ? ['Birthplace', bio.data.birthPlace] : null,
    bio.data?.citizenship ? ['Nationality', bio.data.citizenship] : null,
    onRoster ? null : ['Status', 'Not on an NBA roster'],
  ].filter((r): r is [string, string] => r !== null);


  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <PlayerTopBar
        theme={theme}
        name={player.name}
        headshot={player.headshot}
        stats={cardStats}
        statsLabel={showingCareer ? 'Career' : undefined}
        progress={compactProgress}
        watched={isWatched(player.id)}
        onBack={goBack}
        onWatch={() => {
          Haptics.selectionAsync();
          toggle({ id: player.id, name: player.name, teamId: teamId ?? '' });
        }}
        onCompare={() =>
          pushOnce(
            `/matchup-compare?${new URLSearchParams({
              id: player.id,
              name: player.name,
              teamId: teamId ?? '',
              teamAbbr: team?.abbreviation ?? '',
            }).toString()}` as Href,
          )
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        refreshControl={refreshControl}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}>
      <View style={styles.cardArea}>
        <PlayerCard
          player={player}
          team={team}
          theme={theme}
          width={cardWidth}
          scrollY={scrollY}
          stats={cardStats}
          ranks={showingCareer ? undefined : ranks}
          statsLabel={showingCareer ? 'Career' : undefined}
          loading={cardLoading}
          honors={profile?.honors}
          titles={career ? titleSeasons(career.seasons).length : 0}
          cups={career ? cupSeasons(career.seasons).length : 0}
          status={!onRoster && bio.data ? (bio.data.active ? 'Free agent' : 'Retired') : undefined}
          injury={injury ? { status: injury.status, detail: injury.detail } : undefined}
        />
      </View>

      {/* Tab selector (ScrollView overrides a sticky child's style, so the styled bar sits inside a plain View) */}
      <View>
      <Animated.View style={[styles.tabBar, { backgroundColor: theme.background }]}>
        {([
          { key: 'season', label: 'Season' },
          { key: 'career', label: 'Career' },
          { key: 'games', label: 'Games' },
          { key: 'info', label: 'Info' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tabBtn, active && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabLabel, { color: active ? palette.chalk : palette.muted }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>
      </View>

      {/* Tab content */}
      <View key={activeTab} style={[styles.detailsContent, { paddingBottom: insets.bottom + 32 }]}>

        {activeTab === 'season' && (
          <>
            {statsPending ? (
              <StatsSkeleton />
            ) : stats && Object.values(stats).some((v) => v != null) ? (
              <Animated.View style={styles.statsBlock}>
                {(stats.fgPct != null || stats.threePct != null || stats.ftPct != null) && (
                  <>
                    <Text style={styles.sectionLabel}>
                      Shooting{stats.gamesPlayed != null ? ` · ${stats.gamesPlayed} games${stats.gamesStarted != null ? `, ${stats.gamesStarted} started` : ''}` : ''}
                    </Text>
                    <Card padded={false} radius={18}>
                      {([
                        { label: 'Field Goals', val: stats.fgPct },
                        { label: '3-Pointers', val: stats.threePct },
                        { label: 'Free Throws', val: stats.ftPct },
                      ] as { label: string; val: number | undefined }[])
                        .filter(({ val }) => val != null)
                        .map(({ label, val }, i, arr) => (
                          <View key={label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
                            <Text style={styles.infoLabel}>{label}</Text>
                            <Text style={styles.infoValue}>{(val! * 100).toFixed(1)}%</Text>
                          </View>
                        ))}
                    </Card>
                  </>
                )}
                {/* How he is playing right now comes right after the averages; the shooting breakdown follows. */}
                {gameLog && gameLog.length > 1 && <FormCard log={gameLog} accent={theme.accent} />}

                {gameLog && gameLog.length > 0 && <PlayerHighlights name={player.name} log={gameLog} accent={theme.accent} />}

                {gameLog && gameLog.length > 0 && <PlayerShotChart athleteId={player.id} log={gameLog} accent={theme.accent} />}

                {gameLog && gameLog.length > 3 && <SplitsCard log={gameLog} />}

                {rating2k && <View style={{ marginTop: 18 }}><RatingCard rating={rating2k} scrollY={scrollY} /></View>}
              </Animated.View>
            ) : (
              <EmptyState title={onRoster ? 'No stats yet' : 'Not on a roster'} text={onRoster
                    ? 'Season stats will appear once the season begins.'
                    : 'This player isn’t on an NBA roster right now. The Career tab has the full history.'} />
            )}
          </>
        )}

        {activeTab === 'career' && (
          career ? (
            <CareerTable career={career} accent={theme.accent} background={theme.background} />
          ) : (
            careerPending ? (
              <CareerSkeleton />
            ) : (
              <Animated.View style={styles.emptyTab}>
                <Text style={styles.emptyText}>Career stats are unavailable.</Text>
              </Animated.View>
            )
          )
        )}

        {activeTab === 'games' && (
          logPending ? (
            <GameLogSkeleton />
          ) : (
            <Animated.View>
              <GameLog entries={gameLog ?? []} accent={theme.accent} />
            </Animated.View>
          )
        )}

        {activeTab === 'info' && (
          profilePending ? (
            <InfoSkeleton />
          ) : (
          <>
            <HonorsCard honors={profile?.honors ?? []} titles={career ? titleSeasons(career.seasons) : []} cups={career ? cupSeasons(career.seasons) : []} allStars={allStars?.[player.id]} />
            <ContractCard contract={profile?.contract} draft={profile?.draft} />
            {infoRows.length > 0 ? (
              <Card padded={false} radius={18}>
                {infoRows.map(([label, value], i) => (
                  <View key={label} style={[styles.infoRow, i < infoRows.length - 1 && styles.infoRowBorder]}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>{value}</Text>
                  </View>
                ))}
              </Card>
            ) : (
              <EmptyState title="No info" text="Player details not available." />
            )}
          </>
          )
        )}
      </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, paddingBottom: 80 },
  unavailableTitle: { fontFamily: fonts.displayBold, fontSize: 28, color: palette.chalk },
  unavailableText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha(palette.chalk, 0.1),
    marginBottom: 4,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },

  // Content
  detailsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  sectionLabel: { ...textStyle.sectionLabel, marginBottom: 8 },
  statsBlock: {
    gap: 0,
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
  gamesNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyTab: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
  },
});
