import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, CompareIcon, StarIcon } from '@/components';
import { useAllStars, usePlayerBio, usePlayerCareer, usePlayerGameLog, usePlayerProfile, usePlayerStats, useRefresh, useRoster, useTeam, useTilt } from '@/hooks';
import { nba2kRating, titleSeasons } from '@/lib/league';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { goBack, goToScreen } from '@/navigation';
import { useWatchlist } from '@/state';
import { CareerSkeleton, CareerTable, ContractCard, FormCard, GameLog, GameLogSkeleton, HonorsCard, InfoSkeleton, PlayerPageSkeleton, PlayerShotChart, RatingCard, SplitsCard, StatsSkeleton } from '../../components';

/** Fades a photo's left, right and bottom edges into `color` (the surface behind it). */
function EdgeFade({ color }: { color: string }) {
  // An eased ramp: a straight one reads as a band.
  const ramp = [withAlpha(color, 0), withAlpha(color, 0.35), withAlpha(color, 0.78), color] as const;
  const stops = [0, 0.4, 0.75, 1] as const;
  return (
    <>
      <LinearGradient pointerEvents="none" colors={[ramp[3], ramp[2], ramp[1], ramp[0]]} locations={[0, 0.25, 0.6, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[fade.side, { left: 0 }]} />
      <LinearGradient pointerEvents="none" colors={ramp} locations={stops} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[fade.side, { right: 0 }]} />
      <LinearGradient pointerEvents="none" colors={ramp} locations={[0, 0.35, 0.65, 0.85]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={fade.bottom} />
    </>
  );
}

const fade = StyleSheet.create({
  side: { position: 'absolute', top: 0, bottom: 0, width: '16%' },
  // A little past the photo's own edge: at a fractional position its last pixel row would otherwise show as a line.
  bottom: { position: 'absolute', left: -1, right: -1, bottom: -2, height: '32%' },
});

const MAX_ROTATE = 10;

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

  const { data: stats, isPending: statsPending } = usePlayerStats(player?.id);
  const rating2k = nba2kRating(player?.name);
  const { data: gameLog, isPending: logPending } = usePlayerGameLog(player?.id);
  const { data: career, isPending: careerPending } = usePlayerCareer(activeTab === 'career' || activeTab === 'info' ? player?.id : undefined);
  const { data: allStars } = useAllStars(activeTab === 'info');
  const { data: profile, isPending: profilePending } = usePlayerProfile(activeTab === 'info' ? player?.id : undefined);
  // A retired player's pages are history; only someone still on a roster has numbers that move.
  const refreshControl = useRefresh([['playerStats', id], ['playerGameLog', id], ['playerCareer', id], ['roster', teamId], ['playerBio', id]], onRoster);

  const cardWidth = Math.min(width * 0.6, 240);
  const cardHeight = Math.round(cardWidth * 1.22);
  const tilt = useTilt({ width: cardWidth, height: cardHeight }, { scrollSafe: true });
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // Destructure shared values so useAnimatedStyle closures don't capture the gesture
  const tiltX = tilt.x;
  const tiltY = tilt.y;

  // The card shrinks and fades as it scrolls away so the stats take over the screen.
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, cardHeight * 0.8], [1, 0.25], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [0, cardHeight], [1, 0.82], Extrapolation.CLAMP) },
      { perspective: 900 },
      { rotateY: `${tiltX.value * MAX_ROTATE}deg` },
      { rotateX: `${-tiltY.value * MAX_ROTATE}deg` },
    ],
  }));

  const jerseyParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 18 },
      { translateY: tiltY.value * 10 },
    ],
  }));

  const headshotParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 8 },
      { translateY: tiltY.value * 5 },
    ],
  }));

  if (!player && bio.isError) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={14}
            style={[styles.backBtn, { backgroundColor: withAlpha(theme.primary, 0.18) }]}>
            <ArrowLeftIcon color={theme.accent} size={20} />
          </Pressable>
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

  const teamLogoUri = team?.logoDark || team?.logo;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Back button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={14}
          style={[styles.backBtn, { backgroundColor: withAlpha(theme.primary, 0.18) }]}>
          <ArrowLeftIcon color={theme.accent} size={20} />
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            toggle({ id: player.id, name: player.name, teamId: teamId ?? '' });
          }}
          accessibilityRole="button"
          accessibilityLabel={isWatched(player.id) ? 'Remove from watchlist' : 'Add to watchlist'}
          hitSlop={10}
          style={[styles.starBtn, { backgroundColor: withAlpha(theme.primary, 0.18) }]}>
          <StarIcon color={theme.accent} size={20} filled={isWatched(player.id)} />
        </Pressable>
        <Pressable
          onPress={() =>
            goToScreen(
              `/compare?${new URLSearchParams({
                id: player.id,
                name: player.name,
                teamId: teamId ?? '',
                teamAbbr: team?.abbreviation ?? '',
              }).toString()}` as Href,
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Compare this player"
          hitSlop={10}
          style={[styles.compareBtn, { backgroundColor: withAlpha(theme.primary, 0.18) }]}>
          <CompareIcon color={theme.accent} size={18} />
          <Text style={[styles.compareLabel, { color: theme.accent }]}>Compare</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        refreshControl={refreshControl}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}>
      {/* Tilt card */}
      <View style={styles.cardArea}>
        <GestureDetector gesture={tilt.gesture}>
          <Animated.View
            style={[
              styles.card,
              { width: cardWidth, height: cardHeight, backgroundColor: theme.primary },
              cardStyle,
            ]}>

            {/* Team logo watermark */}
            {teamLogoUri && (
              <Image
                source={teamLogoUri}
                style={[styles.logoWatermark, { width: cardWidth * 0.75, height: cardWidth * 0.75 }]}
                contentFit="contain"
                allowDownscaling={false}
                priority="high"
                cachePolicy="memory-disk"
              />
            )}

            {/* Headshot */}
            <Animated.View style={[styles.headshotContainer, headshotParallax]}>
              {player.headshot ? (
                <View style={{ width: cardWidth * 0.72, height: cardWidth * 0.78 }}>
                  <Image
                    source={player.headshot}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    allowDownscaling={false}
                    priority="high"
                    cachePolicy="memory-disk"
                  />
                  {/* ESPN's photo is a rectangle with the shoulders cut off square: melt the sides and the bottom into the card
                      color, so the body fades out instead of ending at hard edges. */}
                  <EdgeFade color={theme.primary} />
                </View>
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

            {/* Jersey number: in the upper right corner of the card, drawn over the photo's frame (not under it), so the fade at the
                photo's edges never cuts it. The corner beside the head is empty, so the number sits there in full view. */}
            {player.jersey && (
              <Animated.Text
                pointerEvents="none"
                style={[
                  styles.jerseyCorner,
                  {
                    color: withAlpha(theme.onPrimary, 0.16),
                    fontSize: cardWidth * (player.jersey.length < 2 ? 0.5 : 0.36),
                    lineHeight: cardWidth * (player.jersey.length < 2 ? 0.5 : 0.36),
                    top: cardWidth * 0.03,
                    right: cardWidth * 0.05,
                  },
                  jerseyParallax,
                ]}
                accessibilityElementsHidden>
                {player.jersey}
              </Animated.Text>
            )}

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
                <Text style={styles.sectionLabel}>
                  Averages{stats.gamesPlayed != null ? ` · ${stats.gamesPlayed} games${stats.gamesStarted != null ? `, ${stats.gamesStarted} started` : ''}` : ''}
                </Text>
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
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Shooting</Text>
                    <View style={[styles.infoCard, { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
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
                    </View>
                  </>
                )}
                {/* How he is playing right now comes right after the averages; the shooting breakdown follows. */}
                {gameLog && gameLog.length > 1 && <FormCard log={gameLog} accent={theme.accent} />}

                {gameLog && gameLog.length > 0 && <PlayerShotChart athleteId={player.id} log={gameLog} accent={theme.accent} />}

                {gameLog && gameLog.length > 3 && <SplitsCard log={gameLog} />}

                {rating2k && <View style={{ marginTop: 18 }}><RatingCard rating={rating2k} scrollY={scrollY} /></View>}
              </Animated.View>
            ) : (
              <Animated.View style={styles.emptyTab}>
                <Text style={styles.emptyTitle}>{onRoster ? 'No stats yet' : 'Not on a roster'}</Text>
                <Text style={styles.emptyText}>
                  {onRoster
                    ? 'Season stats will appear once the season begins.'
                    : 'This player isn’t on an NBA roster right now. The Career tab has the full history.'}
                </Text>
              </Animated.View>
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
            <HonorsCard honors={profile?.honors ?? []} titles={career ? titleSeasons(career.seasons) : []} allStars={allStars?.[player.id]} />
            <ContractCard contract={profile?.contract} draft={profile?.draft} />
            {infoRows.length > 0 ? (
              <Animated.View
                style={[styles.infoCard, { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
                {infoRows.map(([label, value], i) => (
                  <View key={label} style={[styles.infoRow, i < infoRows.length - 1 && styles.infoRowBorder]}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>{value}</Text>
                  </View>
                ))}
              </Animated.View>
            ) : (
              <Animated.View style={styles.emptyTab}>
                <Text style={styles.emptyTitle}>No info</Text>
                <Text style={styles.emptyText}>Player details not available.</Text>
              </Animated.View>
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
  starBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    marginRight: 8,
  },
  compareBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Centred behind the head, a touch lower than the top so a two-digit number above it stays clear.
  logoWatermark: {
    position: 'absolute',
    top: '14%',
    left: '12%',
    opacity: 0.08,
  },
  jerseyCorner: { position: 'absolute', fontFamily: fonts.display },
  headshotContainer: {
    position: 'absolute',
    bottom: 64,
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 1,
  },
  cardJerseyLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 1,
  },
  cardName: {
    fontFamily: fonts.display,
    fontSize: 30,
  },
  cardPosition: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
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
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: palette.chalk,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
  },
});
