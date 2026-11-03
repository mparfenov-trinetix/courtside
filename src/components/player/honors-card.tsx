import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CupIcon } from '@/components/icons';
import { seasonLabel, type Contract, type Draft, type Honor } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

const GOLD = '#FBBF24';

/** The big ones first, then team selections, then the rest. */
const PRIORITY: [RegExp, number][] = [
  [/^MVP$/i, 0],
  [/finals mvp/i, 1],
  [/defensive player/i, 2],
  [/rookie of the year/i, 3],
  [/all-star mvp/i, 4],
  [/(sixth|6th)|most improved|clutch|scoring champion|assists leader|rebounds leader/i, 5],
  [/all-nba 1st/i, 6],
  [/all-nba 2nd/i, 7],
  [/all-nba 3rd/i, 8],
  [/all-defensive 1st/i, 9],
  [/all-defensive 2nd/i, 10],
  [/all-rookie 1st/i, 11],
  [/all-rookie 2nd/i, 12],
];
const rank = (name: string) => PRIORITY.find(([re]) => re.test(name))?.[1] ?? 20;

const years = (seasons: number[]) => {
  const shown = seasons.slice(0, 4).map(seasonLabel).join(' · ');
  return seasons.length > 4 ? `${shown} · +${seasons.length - 4} more` : shown;
};

/** Titles (worked out from the teams he won with) and everything ESPN lists as an award. */
export function HonorsCard({ honors, titles }: { honors: Honor[]; titles: number[] }) {
  const sorted = [...honors].sort((a, b) => rank(a.name) - rank(b.name) || b.count - a.count);
  if (sorted.length === 0 && titles.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.wrap}>
      <Text style={styles.title}>Honors</Text>
      <View style={styles.card}>
        {titles.length > 0 && (
          <View style={[styles.row, sorted.length > 0 && styles.border]}>
            <View style={[styles.badge, { backgroundColor: withAlpha(GOLD, 0.16) }]}>
              <CupIcon color={GOLD} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>NBA champion</Text>
              <Text style={styles.sub}>{years(titles)} · with the team he played for that season</Text>
            </View>
            <Text style={[styles.count, { color: GOLD }]}>×{titles.length}</Text>
          </View>
        )}
        {sorted.map((h, i) => (
          <View key={h.id} style={[styles.row, i < sorted.length - 1 && styles.border]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{h.count}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{h.name}</Text>
              {h.seasons.length > 0 && <Text style={styles.sub}>{years(h.seasons)}</Text>}
            </View>
            <Text style={styles.count}>×{h.count}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const money = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);

/** Salary and how long it runs, with the draft slot. Only what ESPN publishes: no future-year salaries. */
export function ContractCard({ contract, draft }: { contract?: Contract; draft?: Draft }) {
  if (!contract && !draft) return null;
  const notes = [
    contract?.option ? 'Has an option year' : null,
    contract?.tradeKicker ? 'Trade kicker' : null,
    contract?.tradeRestriction ? 'Trade restricted' : null,
    contract?.minimumException ? 'Minimum contract' : null,
  ].filter(Boolean) as string[];

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(280)} style={styles.wrap}>
      <Text style={styles.title}>Contract{contract ? ` · ${seasonLabel(contract.season)}` : ''}</Text>
      <View style={styles.card}>
        <View style={styles.stats}>
          {contract && (
            <>
              <Stat value={money(contract.salary)} label="Salary" />
              <Stat value={String(contract.yearsRemaining)} label={contract.yearsRemaining === 1 ? 'Year left' : 'Years left'} />
            </>
          )}
          {draft && <Stat value={`#${draft.pick}`} label={`${draft.year} · Rd ${draft.round}`} />}
        </View>
        {notes.length > 0 && <Text style={styles.notes}>{notes.join(' · ')}</Text>}
      </View>
    </Animated.View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  title: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: palette.muted, marginBottom: 8 },
  card: { borderRadius: 18, backgroundColor: withAlpha('#FFFFFF', 0.06), overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(palette.chalk, 0.1) },
  badgeText: { fontFamily: fonts.display, fontSize: 18, color: palette.chalk },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  count: { fontFamily: fonts.display, fontSize: 22, color: palette.chalk },
  stats: { flexDirection: 'row', padding: 14, gap: 10 },
  stat: { flex: 1, gap: 1 },
  statValue: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  notes: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, paddingHorizontal: 14, paddingBottom: 12 },
});
