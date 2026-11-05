import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompareRow, PlayerExtras, type Row, Radar, type RadarAxis, TeamCompare } from '../../components';
import { Segmented, slideIn, ScreenHeader } from '@/components';
import { usePlayerCareer, usePlayerSearch, usePlayerStats, useTeams } from '@/hooks';
import { headshotUrl, type PlayerCareer, type PlayerSearchResult, type PlayerSeasonStats, type Team } from '@/lib/espn';
import { nba2kRating } from '@/lib/league';
import { fonts, matchupColors, palette, withAlpha } from '@/lib/theme';
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

export function CompareScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string; teamId?: string; teamAbbr?: string; mode?: string }>();
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
  const [slotB, setSlotB] = useState<Slot>(null);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const slotA = pickedA !== undefined ? pickedA : fromParams;

  const { data: statsA } = usePlayerStats(slotA?.id);
  const { data: statsB } = usePlayerStats(slotB?.id);
  const { data: careerA } = usePlayerCareer(scope === 'career' ? slotA?.id : undefined);
  const { data: careerB } = usePlayerCareer(scope === 'career' ? slotB?.id : undefined);

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
      <ScreenHeader title="Compare" />
      {/* Inside the scroll view, so it scrolls away with the page instead of taking room all the time. */}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
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
          <TeamCompare />
        ) : (
          <>
        <View style={styles.slots}>
          <PlayerSlot slot={slotA} color={colors.away} onPress={() => setPicking('a')} />
          <Text style={styles.vs}>VS</Text>
          <PlayerSlot slot={slotB} color={colors.home} onPress={() => setPicking('b')} />
        </View>

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
          <Animated.View style={styles.empty}>
            <Text style={styles.emptyTitle}>{slotA && slotB ? 'Loading stats' : 'Pick two players'}</Text>
            <Text style={styles.emptyText}>
              {slotA && slotB
                ? 'Fetching season averages.'
                : 'Search any NBA player and see their season averages head to head.'}
            </Text>
            {slotA && slotB && <ActivityIndicator color={palette.muted} style={{ marginTop: 12 }} />}
          </Animated.View>
        )}

        {slotA && slotB && <PlayerExtras a={slotA} b={slotB} aColor={colors.away} bColor={colors.home} />}
          </>
        )}
        </Animated.View>
      </ScrollView>

      <PickerModal
        visible={picking != null}
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

function PlayerSlot({ slot, color, onPress }: { slot: Slot; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.slot, { borderColor: withAlpha(color, 0.5) }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.avatar, { backgroundColor: withAlpha(color, 0.3) }]}>
        {slot ? (
          <Image source={slot.headshot} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Text style={styles.plus}>+</Text>
        )}
      </View>
      <Text style={styles.slotName} numberOfLines={2}>{slot ? slot.name : 'Choose player'}</Text>
      <Text style={styles.slotTeam}>{slot ? slot.teamAbbr ?? ' ' : 'Tap to search'}</Text>
    </Pressable>
  );
}

function PickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
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
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search players, e.g. Curry"
            placeholderTextColor={palette.muted}
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
            <Pressable onPress={() => onPick(item)} style={({ pressed }) => [styles.result, pressed && { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
              <View style={styles.resultAvatar}>
                <Image source={item.headshot} style={styles.resultImg} contentFit="cover" />
              </View>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultTeam}>{item.teamAbbr ?? ''}</Text>
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
  slots: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginTop: 8, marginBottom: 16 },
  vs: { fontFamily: fonts.display, fontSize: 20, color: palette.muted },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: withAlpha('#FFFFFF', 0.05),
  },
  avatar: { width: 92, height: 92, borderRadius: 46, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 106, height: 92 },
  plus: { fontFamily: fonts.display, fontSize: 44, color: palette.chalk },
  slotName: { fontFamily: fonts.displayBold, fontSize: 20, color: palette.chalk, textAlign: 'center', minHeight: 48 },
  slotTeam: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  card: { marginHorizontal: 16, borderRadius: 22, padding: 16, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  tally: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tallyNum: { fontFamily: fonts.display, fontSize: 44 },
  tallyLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 28, color: palette.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: palette.arena, paddingHorizontal: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.chalk,
    backgroundColor: withAlpha('#FFFFFF', 0.08),
  },
  cancel: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted },
  noResults: { textAlign: 'center', marginTop: 32, fontFamily: fonts.body, fontSize: 15, color: palette.muted },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14 },
  resultAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: withAlpha(palette.chalk, 0.1) },
  resultImg: { width: 52, height: 44 },
  resultName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  resultTeam: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
});
