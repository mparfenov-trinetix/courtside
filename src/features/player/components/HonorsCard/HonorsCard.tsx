import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BasketballIcon,
  ConferenceMvpTrophyIcon,
  CupIcon,
  DpoyTrophyIcon,
  FinalsMvpTrophyIcon,
  LarryOBrienIcon,
  MvpTrophyIcon,
  PeopleIcon,
  RoyTrophyIcon,
  StarIcon,
  TrophyIcon,
} from '@/components';
import { seasonLabel, type Contract, type Draft, type Honor } from '@/lib/espn';
import { CHAMPIONS } from '@/lib/league';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { GOLD, PRIORITY } from './constants';
const rank = (name: string) => PRIORITY.find(([re]) => re.test(name))?.[1] ?? 20;

const years = (seasons: number[]) => {
  const shown = seasons.slice(0, 4).map(seasonLabel).join(' · ');
  return seasons.length > 4 ? `${shown} · +${seasons.length - 4} more` : shown;
};

/** Which small icon stands for an award: trophies for the individual prizes, a star for selections, and so on. */
function iconFor(name: string): ComponentType<{ color: string; size?: number }> {
  // The big individual awards have their own trophy (the ones the player card shows).
  if (/^MVP$/i.test(name)) return MvpTrophyIcon;
  if (/(^|nba )finals mvp$/i.test(name)) return FinalsMvpTrophyIcon;
  if (/conference finals mvp/i.test(name)) return ConferenceMvpTrophyIcon;
  if (/defensive player/i.test(name)) return DpoyTrophyIcon;
  if (/rookie of the year/i.test(name)) return RoyTrophyIcon;
  if (/all-star$/i.test(name)) return StarIcon;
  if (/mvp|player of the year|champion|scoring|leader/i.test(name)) return TrophyIcon;
  if (/all-nba|all-defensive|all-rookie|all-tournament/i.test(name)) return PeopleIcon;
  return BasketballIcon;
}

/** The title line: the team when every title was with one team, otherwise a general note. */
function titleNote(titles: number[]) {
  const teams = [...new Set(titles.map((y) => CHAMPIONS[y]).filter(Boolean))];
  const team = teams.length === 1 ? teams[0] : null;
  return {
    name: titles.length === 1 && team ? `NBA champion · ${team}` : 'NBA champion',
    sub:
      titles.length === 1 || !team
        ? `${years(titles)}${titles.length > 1 ? ' · with the team he played for that season' : ''}`
        : `${years(titles)} · with ${team}`,
  };
}

/** Titles (worked out from the teams he won with) and everything ESPN lists as an award. */
export function HonorsCard({ honors, titles, cups = [], allStars = [] }: { honors: Honor[]; titles: number[]; cups?: number[]; allStars?: number[] }) {
  // ESPN lists only the All-Star MVP; selections come from who played in each All-Star Game (since 2003).
  const withSelections: Honor[] = allStars.length > 0 ? [...honors, { id: 'all-star', name: 'NBA All-Star', count: allStars.length, seasons: allStars }] : honors;
  const sorted = [...withSelections].sort((a, b) => rank(a.name) - rank(b.name) || b.count - a.count);
  if (sorted.length === 0 && titles.length === 0 && cups.length === 0) return null;
  const note = titles.length > 0 ? titleNote(titles) : null;

  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>Honors</Text>
      <View style={styles.card}>
        {note && (
          <View style={[styles.row, sorted.length > 0 && styles.border]}>
            <View style={[styles.badge, { backgroundColor: withAlpha(GOLD, 0.16) }]}>
              <LarryOBrienIcon color={GOLD} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{note.name}</Text>
              <Text style={styles.sub}>{note.sub}</Text>
            </View>
            {titles.length > 1 && <Text style={[styles.count, { color: GOLD }]}>×{titles.length}</Text>}
          </View>
        )}
        {cups.length > 0 && (
          <View style={[styles.row, (note || sorted.length > 0) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.1) }]}>
            <View style={[styles.badge, { backgroundColor: withAlpha(GOLD, 0.16) }]}>
              <CupIcon color={GOLD} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>NBA Cup champion</Text>
              <Text style={styles.sub}>{years(cups)}</Text>
            </View>
            {cups.length > 1 && <Text style={[styles.count, { color: GOLD }]}>×{cups.length}</Text>}
          </View>
        )}
        {sorted.map((h, i) => {
          const Icon = iconFor(h.name);
          return (
            <View key={h.id} style={[styles.row, i < sorted.length - 1 && styles.border]}>
              <View style={styles.badge}>
                <Icon color={palette.chalk} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{h.name}</Text>
                {h.seasons.length > 0 && <Text style={styles.sub}>{years(h.seasons)}</Text>}
              </View>
              {h.count > 1 && <Text style={styles.count}>×{h.count}</Text>}
            </View>
          );
        })}
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
    <Animated.View style={styles.wrap}>
      {/* Without a contract (retired, between teams) the card is only his draft slot. */}
      <Text style={styles.title}>{contract ? `Contract · ${seasonLabel(contract.season)}` : 'Draft'}</Text>
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
  title: { ...textStyle.sectionLabel, marginBottom: 8 },
  card: { borderRadius: 18, backgroundColor: surfaces.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(palette.chalk, 0.1) },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  count: { fontFamily: fonts.display, fontSize: 22, color: palette.chalk },
  stats: { flexDirection: 'row', padding: 14, gap: 10 },
  stat: { flex: 1, gap: 1 },
  statValue: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  notes: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, paddingHorizontal: 14, paddingBottom: 12 },
});
