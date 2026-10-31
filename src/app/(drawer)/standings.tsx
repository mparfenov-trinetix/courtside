import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState, ScreenHeader } from '@/components/ui';
import { useStandings } from '@/hooks/queries';
import type { StandingEntry } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

type Conference = 'east' | 'west';

const TABS: { key: Conference; label: string }[] = [
  { key: 'east', label: 'Eastern' },
  { key: 'west', label: 'Western' },
];

export default function Standings() {
  const insets = useSafeAreaInsets();
  const [conf, setConf] = useState<Conference>('east');
  const { data, isPending, error, refetch } = useStandings();

  const entries: StandingEntry[] = data?.[conf] ?? [];

  type Section = { title: string; data: StandingEntry[] };
  const sections: Section[] = [];
  const playoff = entries.filter((e) => e.seed <= 6);
  const playIn = entries.filter((e) => e.seed >= 7 && e.seed <= 10);
  const eliminated = entries.filter((e) => e.seed >= 11);
  if (playoff.length) sections.push({ title: 'Playoff', data: playoff });
  if (playIn.length) sections.push({ title: 'Play-In', data: playIn });
  if (eliminated.length) sections.push({ title: 'Out', data: eliminated });

  const flat: (StandingEntry | { sectionTitle: string })[] = sections.flatMap((s) => [
    { sectionTitle: s.title },
    ...s.data,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Standings" color={palette.chalk} />

      <Animated.View entering={FadeIn.duration(300)} style={styles.tabs}>
        {TABS.map((tab) => {
          const active = tab.key === conf;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setConf(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: active
                    ? withAlpha(palette.chalk, 0.12)
                    : withAlpha(palette.chalk, pressed ? 0.06 : 0.04),
                  borderColor: active ? withAlpha(palette.chalk, 0.3) : 'transparent',
                },
              ]}>
              <Text style={[styles.tabLabel, { color: active ? palette.chalk : palette.muted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>

      {isPending ? (
        <LoadingState label="Loading standings" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          key={conf}
          data={flat}
          keyExtractor={(item, i) => ('sectionTitle' in item ? `header-${item.sectionTitle}` : `${item.teamId}-${i}`)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 6 }}
          ListHeaderComponent={<ColumnHeader />}
          renderItem={({ item, index }) => {
            if ('sectionTitle' in item) {
              return <SectionDivider title={item.sectionTitle} />;
            }
            const rowIndex = flat.filter((f) => !('sectionTitle' in f)).indexOf(item);
            return <TeamRow entry={item} index={rowIndex} />;
          }}
        />
      )}
    </View>
  );
}

function ColumnHeader() {
  return (
    <View style={styles.columnHeader}>
      <Text style={[styles.colHeaderText, { flex: 1 }]} />
      <Text style={styles.colHeaderText}>W</Text>
      <Text style={styles.colHeaderText}>L</Text>
      <Text style={styles.colHeaderText}>PCT</Text>
      <Text style={styles.colHeaderText}>GB</Text>
    </View>
  );
}

function SectionDivider({ title }: { title: string }) {
  const accent =
    title === 'Playoff' ? '#34D399' : title === 'Play-In' ? '#FBBF24' : palette.muted;
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: withAlpha(accent, 0.25) }]} />
      <Text style={[styles.dividerLabel, { color: accent }]}>{title}</Text>
      <View style={[styles.dividerLine, { backgroundColor: withAlpha(accent, 0.25) }]} />
    </View>
  );
}

function TeamRow({ entry, index }: { entry: StandingEntry; index: number }) {
  const gbText = entry.gamesBehind === 0 ? '—' : entry.gamesBehind.toFixed(1);
  const pctText = entry.winPct.toFixed(3).replace(/^0/, '');

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 14) * 20).duration(260).easing(Easing.out(Easing.cubic))}
      style={styles.row}>
      <Text style={styles.seed}>{entry.seed}</Text>
      {entry.teamLogo ? (
        <Image source={entry.teamLogo} style={styles.logo} contentFit="contain" />
      ) : (
        <View style={[styles.logo, { backgroundColor: withAlpha(palette.chalk, 0.08), borderRadius: 14 }]} />
      )}
      <Text style={styles.teamName} numberOfLines={1}>{entry.teamAbbr || entry.teamName}</Text>
      <Text style={styles.stat}>{entry.wins}</Text>
      <Text style={styles.stat}>{entry.losses}</Text>
      <Text style={styles.stat}>{pctText}</Text>
      <Text style={[styles.stat, { color: palette.muted }]}>{gbText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingHorizontal: 12,
    paddingBottom: 4,
    paddingTop: 2,
  },
  colHeaderText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.muted,
    width: 40,
    textAlign: 'right',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: withAlpha('#FFFFFF', 0.05),
  },
  seed: {
    width: 22,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: palette.muted,
    textAlign: 'center',
    marginRight: 6,
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  teamName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.chalk,
  },
  stat: {
    width: 40,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: palette.chalk,
    textAlign: 'right',
  },
});
