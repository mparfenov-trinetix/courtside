import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { contrast, fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import teams from '../../tests/fixtures/team-colors.json';

const meta = { title: 'Foundations/Team theme board' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type Row = ReturnType<typeof rowOf>;

function rowOf(t: (typeof teams)[number]) {
  const th = teamTheme(t as never);
  return {
    t,
    th,
    accentBefore: contrast(th.brand, th.background),
    accentAfter: contrast(th.accent, th.background),
    separation: contrast(th.primary, th.background),
    stripeBefore: contrast(th.secondary, th.primary),
    stripeAfter: contrast(th.stripe, th.primary),
    changed: th.accent !== th.brand || th.stripe !== th.secondary,
  };
}

const ROWS = teams.map(rowOf);
const f = (n: number) => n.toFixed(1);
const bad = (n: number, min: number) => (n < min ? '#F87171' : '#34D399');

function Line({ r }: { r: Row }) {
  const { th, t } = r;
  return (
    <View style={styles.row}>
      <Text style={styles.abbr}>{t.abbreviation}</Text>

      {/* The card on its own page: without and with the edge the cards now carry. */}
      <View style={[styles.page, { backgroundColor: th.background }]}>
        <View style={[styles.card, { backgroundColor: th.primary }]} />
        <View style={[styles.card, { backgroundColor: th.primary, borderColor: withAlpha(th.edge, 0.5), borderWidth: 1.5 }]} />
        <Text style={[styles.note, { color: bad(r.separation, 1.5) }]}>{f(r.separation)}</Text>
      </View>

      {/* Accent text on the page: the team's own color before, the readable one after. */}
      <View style={[styles.page, { backgroundColor: th.background }]}>
        <View>
          <Text style={[styles.num, { color: th.brand }]}>24.6</Text>
          <Text style={[styles.note, { color: bad(r.accentBefore, 4.5) }]}>{f(r.accentBefore)}</Text>
        </View>
        <View>
          <Text style={[styles.num, { color: th.accent }]}>24.6</Text>
          <Text style={[styles.note, { color: bad(r.accentAfter, 4.5) }]}>{f(r.accentAfter)}</Text>
        </View>
      </View>

      {/* The stripe on the card: before and after. */}
      <View style={[styles.page, { backgroundColor: th.primary }]}>
        <View style={[styles.stripe, { backgroundColor: th.secondary }]} />
        <View style={[styles.stripe, { backgroundColor: th.stripe }]} />
      </View>
    </View>
  );
}

/**
 * Every team at once, so the theme can be checked by eye. Per row: the card on its page without and with its edge (and how close the
 * card is to the page: red under 1.5:1), the accent number on the page before and after with its contrast (red under 4.5:1), and the
 * team stripe on the card before and after. "Changed only" hides the teams the hardening left alone.
 */
export const AllThirtyTeams: Story = { render: () => <Board /> };

function Board() {
    const [onlyChanged, setOnlyChanged] = useState(false);
    const rows = onlyChanged ? ROWS.filter((r) => r.changed || r.separation < 1.5) : ROWS;
    const weakBefore = ROWS.filter((r) => r.accentBefore < 4.5).length;
    const weakAfter = ROWS.filter((r) => r.accentAfter < 4.5).length;
    return (
      <ScrollView style={{ backgroundColor: palette.arena }} contentContainerStyle={styles.list}>
        <Text style={styles.title}>Team themes</Text>
        <Text style={styles.sub}>
          Accent under 4.5:1 on the page: {weakBefore} teams before, {weakAfter} after. Cards within 1.5:1 of their page:{' '}
          {ROWS.filter((r) => r.separation < 1.5).length}.
        </Text>
        <Pressable onPress={() => setOnlyChanged((v) => !v)} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: onlyChanged }}>
          <Text style={styles.toggleText}>{onlyChanged ? 'Showing: changed only' : 'Showing: all 30'} (tap)</Text>
        </Pressable>
        <View style={styles.head}>
          <Text style={[styles.headText, { width: 34 }]}>Team</Text>
          <Text style={[styles.headText, { width: 118 }]}>Card · with edge · gap</Text>
          <Text style={[styles.headText, { width: 100 }]}>Accent before · after</Text>
          <Text style={[styles.headText, { width: 56 }]}>Stripe</Text>
        </View>
        {rows.map((r) => (
          <Line key={r.t.abbreviation} r={r} />
        ))}
      </ScrollView>
    );
}

const styles = StyleSheet.create({
  list: { padding: 14, gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 30, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginBottom: 6 },
  toggle: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: withAlpha('#FFFFFF', 0.1), marginBottom: 6 },
  toggleText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.chalk },
  head: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  headText: { fontFamily: fonts.bodySemi, fontSize: 10, color: palette.muted, letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  abbr: { width: 34, fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk },
  page: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10 },
  card: { width: 36, height: 30, borderRadius: 8 },
  stripe: { width: 22, height: 6, borderRadius: 3 },
  num: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },
  note: { fontFamily: fonts.bodyBold, fontSize: 10 },
});
