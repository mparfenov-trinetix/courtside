import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, ListSkeleton, Segmented, slideIn } from '@/components';
import { Bracket } from '@/features/playoffs';
import { useCup, useRefresh } from '@/hooks';
import { seasonLabel } from '@/lib/espn';
import { buildCupBracket, projectedField, type Cup } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { useTeamStore } from '@/state';
import { CupGameList } from '../CupGames';
import { GroupCard } from '../GroupCard';

type View_ = 'groups' | 'games' | 'knockout';
const VIEWS = [
  { key: 'groups', label: 'Groups' },
  { key: 'games', label: 'Games' },
  { key: 'knockout', label: 'Knockout' },
] as { key: View_; label: string }[];

const GOLD = '#FBBF24';

/** The NBA Cup for a season: groups, every game, and the knockout bracket. */
export function CupContent({ season }: { season?: number }) {
  const insets = useSafeAreaInsets();
  const { favoriteTeamId } = useTeamStore();
  const { cup, conferenceOf, isPending, error, refetch } = useCup(season);
  const refreshControl = useRefresh([['cup'], ['standings']]);
  const [view, setView] = useState<View_>('groups');
  const [slide, setSlide] = useState<1 | -1>(1);
  const [onlyMine, setOnlyMine] = useState(false);

  return (
    <View style={styles.root}>
      {isPending ? (
        <ListSkeleton count={5} avatar="square" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !cup || cup.groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Cup games{season ? ` in ${seasonLabel(season)}` : ' yet'}</Text>
          <Text style={styles.emptyText}>The NBA Cup runs in the early part of the season. Check back when group play starts.</Text>
        </View>
      ) : (
        <>
          <Segmented
            style={styles.switcher}
            options={VIEWS}
            value={view}
            segmentWidth={96}
            onChange={(key, direction) => {
              setSlide(direction);
              setView(key);
            }}
          />
          <ScrollView
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
            <Animated.View key={view} entering={slideIn(slide)}>
              {view === 'groups' ? (
                <Groups cup={cup} favoriteTeamId={favoriteTeamId} />
              ) : view === 'games' ? (
                <Games cup={cup} favoriteTeamId={favoriteTeamId} onlyMine={onlyMine} setOnlyMine={setOnlyMine} />
              ) : (
                <Knockout cup={cup} conferenceOf={conferenceOf} favoriteTeamId={favoriteTeamId} />
              )}
            </Animated.View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

function Field({ cup }: { cup: Cup }) {
  const field = projectedField(cup);
  if (field.length === 0) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldTitle}>{cup.groupStageDone ? 'Knockout field' : 'In position to advance'}</Text>
      <View style={styles.fieldRow}>
        {field.map((r) => (
          <Pressable
            key={r.teamId}
            onPress={() => openDetail(`/team/${r.teamId}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={`${r.abbr}, ${r.position === 'leader' ? 'group leader' : 'wild card'}`}
            style={styles.fieldTeam}>
            {r.logo ? <Image source={r.logo} style={styles.fieldLogo} contentFit="contain" /> : null}
            <Text style={[styles.fieldAbbr, r.position === 'wildcard' && { color: GOLD }]}>{r.abbr}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.fieldNote}>Six group winners, plus the best runner-up in each conference (gold).</Text>
    </View>
  );
}

function Groups({ cup, favoriteTeamId }: { cup: Cup; favoriteTeamId: string | null }) {
  const sections = [
    { title: 'Eastern Conference', groups: cup.groups.filter((g) => g.conference === 'east') },
    { title: 'Western Conference', groups: cup.groups.filter((g) => g.conference === 'west') },
    { title: 'Groups', groups: cup.groups.filter((g) => !g.conference) },
  ].filter((s) => s.groups.length > 0);
  return (
    <View style={{ paddingTop: 12 }}>
      <Text style={styles.progress}>
        {cup.groupStageDone ? 'Group play is complete' : `${cup.groupGamesLeft} of ${cup.groupGames.length} group games left`}
      </Text>
      <Field cup={cup} />
      {sections.map((s) => (
        <View key={s.title}>
          <Text style={styles.section}>{s.title}</Text>
          {s.groups.map((g, i) => (
            <GroupCard key={g.id} group={g} favoriteTeamId={favoriteTeamId} index={i} />
          ))}
        </View>
      ))}
      <Text style={styles.footnote}>
        Ranked by wins, then head-to-head, then point differential (PD). Groups are numbered here because ESPN doesn&apos;t publish
        their letters. &ldquo;In position&rdquo; is where each team stands today, not a clinch.
      </Text>
    </View>
  );
}

function Games({
  cup,
  favoriteTeamId,
  onlyMine,
  setOnlyMine,
}: {
  cup: Cup;
  favoriteTeamId: string | null;
  onlyMine: boolean;
  setOnlyMine: (v: boolean) => void;
}) {
  const all = [...cup.groupGames, ...cup.knockout].sort((a, b) => a.date.localeCompare(b.date));
  const mine = all.filter((g) => g.home.teamId === favoriteTeamId || g.away.teamId === favoriteTeamId);
  const shown = onlyMine ? mine : all;
  const upcoming = shown.filter((g) => !g.completed);
  const played = shown.filter((g) => g.completed).reverse();
  return (
    <View style={{ paddingTop: 12 }}>
      {favoriteTeamId && (
        <View style={styles.filters}>
          {[
            { label: 'All games', value: false },
            { label: 'My team', value: true },
          ].map((f) => (
            <Pressable
              key={f.label}
              onPress={() => setOnlyMine(f.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: onlyMine === f.value }}
              style={[styles.chip, onlyMine === f.value && styles.chipActive]}>
              <Text style={[styles.chipText, onlyMine === f.value && { color: palette.chalk }]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {upcoming.length > 0 && (
        <>
          <Text style={styles.section}>Upcoming</Text>
          <CupGameList games={upcoming} favoriteTeamId={favoriteTeamId} showStage />
        </>
      )}
      {played.length > 0 && (
        <>
          <Text style={styles.section}>Results</Text>
          <CupGameList games={played} favoriteTeamId={favoriteTeamId} showStage />
        </>
      )}
      {shown.length === 0 && <Text style={styles.emptyText}>No Cup games for your team.</Text>}
    </View>
  );
}

function Knockout({
  cup,
  conferenceOf,
  favoriteTeamId,
}: {
  cup: Cup;
  conferenceOf: Record<string, 'east' | 'west'>;
  favoriteTeamId: string | null;
}) {
  const rounds = buildCupBracket(cup.knockout, conferenceOf);
  return (
    <View style={{ paddingTop: 12 }}>
      <Field cup={cup} />
      <View style={{ height: 12 }} />
      <Bracket
        rounds={rounds}
        sections={[{ title: 'NBA Cup knockout', rounds }]}
        favoriteTeamId={favoriteTeamId}
        emptyText="The knockout round isn't set yet. When group play ends, the eight qualifiers play single-game quarterfinals and semifinals, then a championship game; the bracket appears here as ESPN schedules them."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { marginBottom: 14 },
  root: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 30, color: palette.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
  progress: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted, marginBottom: 12, paddingHorizontal: 4 },
  section: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  footnote: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, lineHeight: 16, marginTop: 4, paddingHorizontal: 4 },
  field: { padding: 14, borderRadius: 18, backgroundColor: withAlpha(GOLD, 0.08), borderWidth: 1, borderColor: withAlpha(GOLD, 0.3), gap: 10, marginBottom: 6 },
  fieldTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: GOLD },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldTeam: { width: '22.5%', flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
  fieldLogo: { width: 34, height: 34 },
  fieldAbbr: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.chalk },
  fieldNote: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: withAlpha(palette.chalk, 0.06) },
  chipActive: { backgroundColor: withAlpha(palette.chalk, 0.14) },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  info: { padding: 16, borderRadius: 18, backgroundColor: withAlpha('#FFFFFF', 0.05), gap: 6, marginTop: 8 },
  infoTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  infoText: { fontFamily: fonts.body, fontSize: 14, color: palette.muted, lineHeight: 20 },
});
