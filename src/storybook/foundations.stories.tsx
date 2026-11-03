import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { away, home } from '@/storybook/fixtures';

const meta = { title: 'Foundations/Theme' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.grid}>
      {Object.entries(palette).map(([name, value]) => (
        <View key={name} style={styles.swatchWrap}>
          <View style={[styles.swatch, { backgroundColor: value }]} />
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </ScrollView>
  ),
};

export const Typography: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 56, color: palette.chalk }}>107–126</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 32, color: palette.chalk }}>Display · Big Shoulders</Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: palette.chalk }}>Body bold · Barlow 700</Text>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk }}>Body semibold · Barlow 600</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.muted }}>Body · Barlow 500, used for secondary text.</Text>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Section label
      </Text>
    </ScrollView>
  ),
};

/** `teamTheme(team)` turns ESPN's two team colors into a full palette; the app never hard-codes team colors. */
export const TeamThemes: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      {[away.team, home.team].map((team) => {
        const theme = teamTheme(team);
        return (
          <View key={team.id} style={[styles.themeCard, { backgroundColor: theme.background, borderColor: withAlpha(theme.accent, 0.5) }]}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: theme.onPrimary }}>{team.displayName}</Text>
            <View style={styles.chips}>
              {Object.entries(theme).map(([name, value]) => (
                <View key={name} style={styles.chip}>
                  <View style={[styles.dot, { backgroundColor: value }]} />
                  <Text style={styles.value}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  ),
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  swatchWrap: { width: '30%', flexGrow: 1, gap: 4 },
  swatch: { height: 56, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(palette.chalk, 0.15) },
  name: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.chalk },
  value: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  themeCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: withAlpha(palette.chalk, 0.25) },
});
