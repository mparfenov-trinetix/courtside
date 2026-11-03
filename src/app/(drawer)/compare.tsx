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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompareRow, type Row } from '@/components/compare/compare-row';
import { TeamCompare } from '@/components/compare/team-compare';
import { Segmented, slideIn } from '@/components/segmented';
import { ScreenHeader } from '@/components/ui';
import { usePlayerSearch, usePlayerStats, useTeams } from '@/hooks/queries';
import { headshotUrl, type PlayerSearchResult, type PlayerSeasonStats, type Team } from '@/lib/espn';
import { fonts, matchupColors, palette, withAlpha } from '@/lib/theme';

type Slot = PlayerSearchResult | null;

const MODES = [
  { key: 'players', label: 'Players' },
  { key: 'teams', label: 'Teams' },
] as const;

const one = (v: number) => v.toFixed(1);
const percent = (v: number) => `${(v * 100).toFixed(1)}%`;
const whole = (v: number) => String(Math.round(v));

function buildRows(a: PlayerSeasonStats, b: PlayerSeasonStats): Row[] {
  return [
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

export default function Compare() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string; teamId?: string; teamAbbr?: string; mode?: string }>();
  const mode = params.mode === 'teams' ? 'teams' : 'players';
  const [slide, setSlide] = useState<1 | -1>(1);
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

  const teamOf = (s: Slot): Team | undefined => teams?.find((t) => t.id === s?.teamId);
  const teamA = teamOf(slotA);
  const teamB = teamOf(slotB);
  const fallback = { color: '#8A96A8', alternateColor: '#F2F4F7' };
  const colors = matchupColors(teamA ?? fallback, teamB ?? { color: '#E2B077', alternateColor: '#F2F4F7' });

  const rows = statsA && statsB ? buildRows(statsA, statsB) : [];
  const winsA = rows.filter((r) => (r.a ?? -1) > (r.b ?? -1)).length;
  const winsB = rows.filter((r) => (r.b ?? -1) > (r.a ?? -1)).length;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Compare" />
      <Segmented
        options={[...MODES]}
        value={mode}
        onChange={(key, direction) => {
          setSlide(direction);
          router.setParams({ mode: key });
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
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

        {rows.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
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
          <Animated.View entering={FadeIn.duration(300)} style={styles.empty}>
            <Text style={styles.emptyTitle}>{slotA && slotB ? 'Loading stats' : 'Pick two players'}</Text>
            <Text style={styles.emptyText}>
              {slotA && slotB
                ? 'Fetching season averages.'
                : 'Search any NBA player and see their season averages head to head.'}
            </Text>
            {slotA && slotB && <ActivityIndicator color={palette.muted} style={{ marginTop: 12 }} />}
          </Animated.View>
        )}
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
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
