import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Pill, SectionLabel, TrophyIcon } from '@/components';
import { fontSize, fonts, motion, palette, radius, space, surfaces, teamTheme } from '@/lib/theme';
import teams from '../../tests/fixtures/team-colors.json';

const meta = { title: 'Foundations/Primitives and scales' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const theme = (abbr: string) => teamTheme(teams.find((t) => t.abbreviation === abbr) as never);

/** The shared building blocks: Card (neutral tones and a team card on a dark page), Pill, Button, SectionLabel, EmptyState. */
export const Primitives: Story = {
  render: () => {
    const sas = theme('SA');
    const mia = theme('MIA');
    return (
      <ScrollView style={{ backgroundColor: palette.arena }} contentContainerStyle={styles.page}>
        <SectionLabel>Card · tones</SectionLabel>
        {(['faint', 'card', 'raised'] as const).map((tone) => (
          <Card key={tone} tone={tone}>
            <Text style={styles.text}>{`tone="${tone}"`}</Text>
          </Card>
        ))}

        <SectionLabel>Card · team (note the edge on the Spurs: black on a near-black page)</SectionLabel>
        <View style={[styles.stage, { backgroundColor: sas.background }]}>
          <Card team={sas}>
            <Text style={[styles.title, { color: sas.onPrimary }]}>San Antonio</Text>
          </Card>
        </View>
        <View style={[styles.stage, { backgroundColor: mia.background }]}>
          <Card team={mia}>
            <Text style={[styles.title, { color: mia.onPrimary }]}>Miami</Text>
            <Text style={[styles.title, { color: mia.accent, fontSize: 28 }]}>24.6 · accent text, readable</Text>
          </Card>
        </View>

        <SectionLabel>Pill</SectionLabel>
        <View style={styles.row}>
          <Pill>Muted</Pill>
          <Pill tone="gold" icon={<TrophyIcon color={palette.gold} size={14} />}>
            Champion ×2
          </Pill>
          <Pill tone="win">W</Pill>
          <Pill tone="loss">L</Pill>
        </View>
        <View style={[styles.stage, { backgroundColor: mia.primary }]}>
          <View style={styles.row}>
            <Pill on={mia.onPrimary}>G</Pill>
            <Pill on={mia.onPrimary}>{`6'2"`}</Pill>
          </View>
        </View>

        <SectionLabel>Button</SectionLabel>
        <View style={styles.row}>
          <Button label="Try again" onPress={() => {}} />
          <Button label="Secondary" tone="secondary" onPress={() => {}} />
          <Button label="Quiet" tone="quiet" onPress={() => {}} />
        </View>

        <SectionLabel>EmptyState</SectionLabel>
        <Card tone="faint" padded={false}>
          <EmptyState title="No games yet" text="The game log fills in once the season is underway." action={<Button label="Check back" tone="secondary" onPress={() => {}} />} />
        </Card>
      </ScrollView>
    );
  },
};

/** The scales: surfaces, radii, spacing, font sizes and motion durations, each drawn at its value. */
export const Scales: Story = {
  render: () => (
    <ScrollView style={{ backgroundColor: palette.arena }} contentContainerStyle={styles.page}>
      <SectionLabel>surfaces</SectionLabel>
      <View style={styles.row}>
        {Object.entries(surfaces).map(([name, value]) => (
          <View key={name} style={[styles.swatch, { backgroundColor: value }]}>
            <Text style={styles.small}>{name}</Text>
          </View>
        ))}
      </View>

      <SectionLabel>radius</SectionLabel>
      <View style={styles.row}>
        {Object.entries(radius).map(([name, value]) => (
          <View key={name} style={[styles.swatch, { borderRadius: Math.min(value, 28), backgroundColor: surfaces.raised }]}>
            <Text style={styles.small}>
              {name} {value === 999 ? '' : value}
            </Text>
          </View>
        ))}
      </View>

      <SectionLabel>space</SectionLabel>
      {Object.entries(space).map(([name, value]) => (
        <View key={name} style={styles.line}>
          <Text style={styles.small}>
            {name} {value}
          </Text>
          <View style={{ width: value, height: 10, backgroundColor: palette.chalk, borderRadius: 2 }} />
        </View>
      ))}

      <SectionLabel>fontSize</SectionLabel>
      {Object.entries(fontSize).map(([name, value]) => (
        <Text key={name} style={{ fontFamily: value >= 32 ? fonts.display : fonts.bodySemi, fontSize: value, color: palette.chalk }}>
          {name} {value}
        </Text>
      ))}

      <SectionLabel>motion (ms)</SectionLabel>
      <Text style={styles.text}>{Object.entries(motion).map(([k, v]) => `${k} ${v}`).join('   ·   ')}</Text>
    </ScrollView>
  ),
};

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  stage: { padding: 12, borderRadius: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  text: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  title: { fontFamily: fonts.display, fontSize: 24 },
  small: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.chalk },
  swatch: { minWidth: 72, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
