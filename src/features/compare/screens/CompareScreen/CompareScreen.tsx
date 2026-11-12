import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompareHeaderTitle, CompareRow, PlayerExtras, PlayerHeadToHead, type Row, Radar, type RadarAxis, TeamCompare, useSlotsStyle, useTeamPicks } from '../../components';
import { MINI_CARD_RATIO, MiniCardEmpty, MiniPlayerCard, Segmented, dealIn, slideIn, ScreenHeader, SearchInput, EmptyState } from '@/components';
import { usePlayerCareer, usePlayerSearch, usePlayerStats, useSceneSettled, useTeams } from '@/hooks';
import { headshotUrl, tricode, type PlayerCareer, type PlayerSearchResult, type PlayerSeasonStats, type Team } from '@/lib/espn';
import { lastNameOf, nba2kRating, namesScale } from '@/lib/league';
import { goBack } from '@/navigation';
import { fonts, matchupColors, palette, teamTheme, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { MODES, SCOPES, CEILING } from './constants';

type Slot = PlayerSearchResult | null;

const one = (v: number) => v.toFixed(1);
const percent = (v: number) => `${(v * 100).toFixed(1)}%`;
const whole = (v: number) => String(Math.round(v));

function buildRows(a: PlayerSeasonStats, b: PlayerSeasonStats, names?: { a?: string; b?: string }): Row[] {
  // NBA 2K27's published overall, when either is in its Top 100 (2K publishes no other ratings).
  const ra = nba2kRating(names?.a)?.overall;
  const rb = nba2kRating(names?.b)?.overall;
  return [
    ...(ra != null || rb != null ? [{ label: 'NBA 2K27 overall', a: ra, b: rb, fmt: whole }] : []),
    { label: 'Points', a: a.ppg, b: b.ppg, fmt: one },
    { label: 'Rebounds', a: a.rpg, b: b.rpg, fmt: one },
    { label: 'Assists', a: a.apg, b: b.apg, fmt: one },
    { label: 'Steals', a: a.spg, b: b.spg, fmt: one },
    { label: 'Blocks', a: a.bpg, b: b.bpg, fmt: one },
    { label: 'Minutes', a: a.mpg, b: b.mpg, fmt: one },
    { label: 'Field goal %', a: a.fgPct, b: b.fgPct, fmt: percent },
    { label: '3-point %', a: a.threePct, b: b.threePct, fmt: percent },
    { label: 'Free throw %', a: a.ftPct, b: b.ftPct, fmt: percent },
    { label: 'Games played', a: a.gamesPlayed, b: b.gamesPlayed, fmt: whole },
  ].filter((r) => r.a != null || r.b != null);
}
type Scope = (typeof SCOPES)[number]['key'];

const num = (v?: string) => {
  const n = parseFloat(v ?? '');
  return isNaN(n) ? undefined : n;
};

function buildCareerRows(a: PlayerCareer, b: PlayerCareer): Row[] {
  const row = (label: string, stat: string, pct = false): Row => ({
    label,
    a: num(a.career[stat]),
    b: num(b.career[stat]),
    fmt: pct ? (v) => `${v.toFixed(1)}%` : one,
  });
  return [
    row('Points', 'PTS'),
    row('Rebounds', 'REB'),
    row('Assists', 'AST'),
    row('Steals', 'STL'),
    row('Blocks', 'BLK'),
    row('Minutes', 'MIN'),
    row('Field goal %', 'FG%', true),
    row('3-point %', '3P%', true),
    row('Free throw %', 'FT%', true),
    { label: 'Games played', a: num(a.career.GP), b: num(b.career.GP), fmt: whole },
  ].filter((r) => r.a != null || r.b != null);
}
function playerAxes(a: { pts?: number; reb?: number; ast?: number; stl?: number; blk?: number; fg?: number }, b: typeof a): RadarAxis[] {
  const f = (v: number | undefined, cap: number) => (v ?? 0) / cap;
  return [
    { label: 'Scoring', a: f(a.pts, CEILING.pts), b: f(b.pts, CEILING.pts) },
    { label: 'Rebounding', a: f(a.reb, CEILING.reb), b: f(b.reb, CEILING.reb) },
    { label: 'Playmaking', a: f(a.ast, CEILING.ast), b: f(b.ast, CEILING.ast) },
    { label: 'Steals', a: f(a.stl, CEILING.stl), b: f(b.stl, CEILING.stl) },
    { label: 'Blocks', a: f(a.blk, CEILING.blk), b: f(b.blk, CEILING.blk) },
    { label: 'Efficiency', a: f(a.fg, CEILING.fg), b: f(b.fg, CEILING.fg) },
  ];
}

/** `pushed`: opened on top of a player or team page, so the header's button goes back instead of opening the menu. */
export function CompareScreen({ pushed = false }: { pushed?: boolean }) {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string; teamId?: string; teamAbbr?: string; mode?: string; id2?: string; name2?: string; teamId2?: string; teamAbbr2?: string }>();
  const mode = params.mode === 'teams' ? 'teams' : 'players';
  const [slide, setSlide] = useState<1 | -1>(1);
  const [scope, setScope] = useState<Scope>('season');
  const { data: teams } = useTeams();

  const fromParams: Slot = params.id
    ? {
        id: params.id,
        name: params.name ?? 'Player',
        teamId: params.teamId || undefined,
        teamAbbr: params.teamAbbr || undefined,
        headshot: headshotUrl(params.id),
      }
    : null;
  const [pickedA, setPickedA] = useState<Slot | undefined>(undefined);
  // A second player can come with the link too (the key matchup of a game opens the two stars side by side).
  // (never the same player as the first: a comparison of someone with himself says nothing)
  const fromParamsB: Slot = params.id2 && params.id2 !== params.id
    ? { id: params.id2, name: params.name2 ?? 'Player', teamId: params.teamId2 || undefined, teamAbbr: params.teamAbbr2 || undefined, headshot: headshotUrl(params.id2) }
    : null;
  const [slotB, setSlotB] = useState<Slot>(fromParamsB);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const slotA = pickedA !== undefined ? pickedA : fromParams;

  const { data: statsA, isLoading: loadingStatsA } = usePlayerStats(slotA?.id);
  const { data: statsB, isLoading: loadingStatsB } = usePlayerStats(slotB?.id);
  const { data: careerA, isLoading: loadingCareerA } = usePlayerCareer(scope === 'career' ? slotA?.id : undefined);
  const { data: careerB, isLoading: loadingCareerB } = usePlayerCareer(scope === 'career' ? slotB?.id : undefined);
  // A card chosen after the screen has settled is dealt in with a flip (not on the screen's own first draw, which is inside the slide in from the menu).
  const settled = useSceneSettled(0);
  // The page's scroll: the cards thin out as it goes and a compact bar with both sides takes their place at the top.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const teamPicks = useTeamPicks();

  const teamOf = (s: Slot): Team | undefined => teams?.find((t) => t.id === s?.teamId);
  const teamA = teamOf(slotA);
  const teamB = teamOf(slotB);
  const fallback = { color: '#8A96A8', alternateColor: '#F2F4F7' };
  const colors = matchupColors(teamA ?? fallback, teamB ?? { color: '#E2B077', alternateColor: '#F2F4F7' });

  const rows =
    scope === 'career'
      ? careerA && careerB
        ? buildCareerRows(careerA, careerB)
        : []
      : statsA && statsB
        ? buildRows(statsA, statsB, { a: slotA?.name, b: slotB?.name })
        : [];
  // The numbers on the cards: season averages, or the career's when that is what is compared; the better of each pair is lit.
  const { width: screen } = useWindowDimensions();
  const cardW = Math.floor((screen - 32 - 10) / 2);
  const lineOf = (season?: PlayerSeasonStats, career?: PlayerCareer) =>
    scope === 'career'
      ? { ppg: career?.career.PTS, rpg: career?.career.REB, apg: career?.career.AST }
      : { ppg: season?.ppg?.toFixed(1), rpg: season?.rpg?.toFixed(1), apg: season?.apg?.toFixed(1) };
  const cardH = Math.round(cardW * MINI_CARD_RATIO);
  const slotsStyle = useSlotsStyle(scrollY, cardH);
  // A player is his last name in the header, cut with an ellipsis when it does not fit: the same size for both, whatever they are called.
  const barA = mode === 'teams' ? teamPicks.teamA : null;
  const barB = mode === 'teams' ? teamPicks.teamB : null;
  const bar =
    mode === 'teams'
      ? barA && barB
        ? { a: { label: tricode(barA.abbreviation), image: barA.logoDark || barA.logo, kind: 'logo' as const, color: teamPicks.colors.away }, b: { label: tricode(barB.abbreviation), image: barB.logoDark || barB.logo, kind: 'logo' as const, color: teamPicks.colors.home } }
        : null
      : slotA && slotB
        ? { a: { label: lastNameOf(slotA.name), image: slotA.headshot, kind: 'face' as const, color: colors.away }, b: { label: lastNameOf(slotB.name), image: slotB.headshot, kind: 'face' as const, color: colors.home } }
        : null;
  const lineA = lineOf(statsA, careerA);
  const lineB = lineOf(statsB, careerB);
  const beats = (x?: string, y?: string) => x != null && y != null && Number(x) > Number(y);
  const better = {
    a: { ppg: beats(lineA.ppg, lineB.ppg), rpg: beats(lineA.rpg, lineB.rpg), apg: beats(lineA.apg, lineB.apg) },
    b: { ppg: beats(lineB.ppg, lineA.ppg), rpg: beats(lineB.rpg, lineA.rpg), apg: beats(lineB.apg, lineA.apg) },
  };

  const winsA = rows.filter((r) => (r.a ?? -1) > (r.b ?? -1)).length;
  const winsB = rows.filter((r) => (r.b ?? -1) > (r.a ?? -1)).length;

  const axes: RadarAxis[] | null =
    scope === 'career'
      ? careerA && careerB
        ? playerAxes(
            { pts: num(careerA.career.PTS), reb: num(careerA.career.REB), ast: num(careerA.career.AST), stl: num(careerA.career.STL), blk: num(careerA.career.BLK), fg: (num(careerA.career['FG%']) ?? 0) / 100 },
            { pts: num(careerB.career.PTS), reb: num(careerB.career.REB), ast: num(careerB.career.AST), stl: num(careerB.career.STL), blk: num(careerB.career.BLK), fg: (num(careerB.career['FG%']) ?? 0) / 100 },
          )
        : null
      : statsA && statsB
        ? playerAxes(
            { pts: statsA.ppg, reb: statsA.rpg, ast: statsA.apg, stl: statsA.spg, blk: statsA.bpg, fg: statsA.fgPct },
            { pts: statsB.ppg, reb: statsB.rpg, ast: statsB.apg, stl: statsB.spg, blk: statsB.bpg, fg: statsB.fgPct },
          )
        : null;

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      {/* The title is "Compare" until the cards have scrolled away, then the two sides rise into the same row. */}
      <ScreenHeader title={<CompareHeaderTitle a={bar?.a} b={bar?.b} scrollY={scrollY} cardH={cardH} scale={mode === 'teams' || !slotA || !slotB ? 1 : namesScale(slotA.name, slotB.name)} />} onBack={pushed ? goBack : undefined} />
      {/* Inside the scroll view, so it scrolls away with the page instead of taking room all the time. */}
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <Segmented
          style={{ marginBottom: 14 }}
          options={[...MODES]}
          value={mode}
          onChange={(key, direction) => {
            setSlide(direction);
            router.setParams({ mode: key });
          }}
        />
        <Animated.View key={mode} entering={slideIn(slide)}>
        {mode === 'teams' ? (
          <TeamCompare scrollY={scrollY} />
        ) : (
          <>
        {/* The two players as small trading cards (a seat to fill when one is missing), VS between them. */}
        <Animated.View style={[styles.slots, slotsStyle]}>
          <PlayerSlot key={slotA?.id ?? 'a'} slot={slotA} team={teamA} color={colors.away} width={cardW} line={lineA} better={better.a} loading={scope === 'career' ? loadingCareerA : loadingStatsA} entering={settled ? dealIn('left') : undefined} onPress={() => setPicking('a')} />
          <PlayerSlot key={slotB?.id ?? 'b'} slot={slotB} team={teamB} color={colors.home} width={cardW} line={lineB} better={better.b} loading={scope === 'career' ? loadingCareerB : loadingStatsB} entering={settled ? dealIn('right', 100) : undefined} onPress={() => setPicking('b')} />
          <View pointerEvents="none" style={[styles.vsBadge, { left: screen / 2 - 20, top: Math.round(cardW * MINI_CARD_RATIO) / 2 - 20 }]}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        </Animated.View>

        {slotA && slotB && (
          <View style={styles.scope}>
            <Segmented options={[...SCOPES]} value={scope} onChange={(key) => setScope(key)} segmentWidth={120} />
          </View>
        )}

        {rows.length > 0 ? (
          <Animated.View key={scope} style={styles.card}>
            {axes && <Radar axes={axes} aColor={colors.away} bColor={colors.home} aName={slotA?.name} bName={slotB?.name} />}
            <View style={styles.tally}>
              <Text style={[styles.tallyNum, { color: colors.away }]}>{winsA}</Text>
              <Text style={styles.tallyLabel}>categories won</Text>
              <Text style={[styles.tallyNum, { color: colors.home }]}>{winsB}</Text>
            </View>
            {rows.map((r, i) => (
              <CompareRow key={r.label} row={r} aColor={colors.away} bColor={colors.home} delay={i * 40} />
            ))}
          </Animated.View>
        ) : (
          <EmptyState
            title={slotA && slotB ? 'Loading stats' : 'Pick two players'}
            text={slotA && slotB ? 'Fetching season averages.' : 'Search any NBA player and see their season averages head to head.'}
            action={slotA && slotB && <ActivityIndicator color={palette.muted} style={{ marginTop: 12 }} />}
          />
        )}

        {slotA && slotB && <PlayerHeadToHead a={slotA} b={slotB} aColor={colors.away} bColor={colors.home} />}
        {slotA && slotB && <PlayerExtras a={slotA} b={slotB} aColor={colors.away} bColor={colors.home} />}
          </>
        )}
        </Animated.View>
      </Animated.ScrollView>

      <PickerModal
        visible={picking != null}
        // The other seat's player cannot be picked again.
        disabledId={picking === 'a' ? slotB?.id : slotA?.id}
        onClose={() => setPicking(null)}
        onPick={(p) => {
          if (picking === 'a') setPickedA(p);
          else setSlotB(p);
          setPicking(null);
        }}
      />
    </View>
  );
}

function PlayerSlot({
  slot,
  team,
  color,
  width,
  line,
  better,
  loading,
  entering,
  onPress,
}: {
  slot: Slot;
  team?: Team;
  color: string;
  width: number;
  line: { ppg?: string; rpg?: string; apg?: string };
  better: { ppg: boolean; rpg: boolean; apg: boolean };
  loading: boolean;
  entering: ComponentProps<typeof MiniPlayerCard>['entering'];
  onPress: () => void;
}) {
  if (!slot) return <MiniCardEmpty width={width} color={color} title="Choose player" hint="Tap to search" onPress={onPress} />;
  return (
    <MiniPlayerCard
      team={team}
      theme={teamTheme(team ?? null)}
      star={{ athleteId: slot.id, name: slot.name, headshot: slot.headshot, ppg: line.ppg ?? '–', rpg: line.rpg ?? '–', apg: line.apg ?? '–' }}
      width={width}
      better={better}
      loading={loading}
      entering={entering}
      onPress={onPress}
    />
  );
}

function PickerModal({
  visible,
  disabledId,
  onClose,
  onPick,
}: {
  visible: boolean;
  /** Already in the other seat: shown, but cannot be chosen. */
  disabledId?: string;
  onClose: () => void;
  onPick: (p: PlayerSearchResult) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setQuery(text), 300);
    return () => clearTimeout(id);
  }, [text]);

  const { data, isFetching } = usePlayerSearch(query);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onDismiss={() => { setText(''); setQuery(''); }} presentationStyle="pageSheet">
      <View style={[styles.modal, { paddingTop: 16 }]}>
        <View style={styles.searchRow}>
          <SearchInput
            value={text}
            onChangeText={setText}
            placeholder="Search players, e.g. Curry"
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            style={styles.input}
          />
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
        {isFetching && <ActivityIndicator color={palette.muted} style={{ marginTop: 16 }} />}
        <FlatList
          data={data ?? []}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            query.trim().length >= 2 && !isFetching ? <Text style={styles.noResults}>No players found</Text> : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item)}
              disabled={item.id === disabledId}
              style={({ pressed }) => [styles.result, item.id === disabledId && { opacity: 0.4 }, pressed && { backgroundColor: surfaces.card }]}>
              <View style={styles.resultAvatar}>
                <Image source={item.headshot} style={styles.resultImg} contentFit="cover" />
              </View>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultTeam}>{item.id === disabledId ? 'Already picked' : (item.teamAbbr ?? '')}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scope: { alignItems: 'center', marginBottom: 12 },
  slots: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 8, marginBottom: 16 },
  // Above the cards, which flip in around it: they must never swing over it.
  vsBadge: { position: 'absolute', zIndex: 10, elevation: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.arena, borderWidth: 1.5, borderColor: withAlpha(palette.chalk, 0.5) },
  vsText: { fontFamily: fonts.display, fontSize: 17, color: palette.chalk, letterSpacing: 0.5 },
  card: { marginHorizontal: 16, borderRadius: 22, padding: 16, backgroundColor: surfaces.card },
  tally: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tallyNum: { fontFamily: fonts.display, fontSize: 44 },
  tallyLabel: { ...textStyle.sectionLabel },
  modal: { flex: 1, backgroundColor: palette.arena, paddingHorizontal: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    borderRadius: 23,
    paddingHorizontal: 18,
    backgroundColor: surfaces.raised,
  },
  cancel: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted },
  noResults: { textAlign: 'center', marginTop: 32, fontFamily: fonts.body, fontSize: 15, color: palette.muted },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14 },
  // The photo is wider than the circle: centered, so the face sits in the middle of it.
  resultAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(palette.chalk, 0.1) },
  resultImg: { width: 52, height: 44 },
  resultName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  resultTeam: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
});
