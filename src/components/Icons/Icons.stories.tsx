import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import * as icons from './Icons';
import { fonts, palette, withAlpha } from '@/lib/theme';

const meta = { title: 'Foundations/Icons' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const all = Object.entries(icons).filter(([name]) => name.endsWith('Icon')) as [string, React.ComponentType<{ color: string; size?: number; filled?: boolean }>][];

/** Every hand-drawn SVG icon (the app has no icon library). */
export const Gallery: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.grid}>
      {all.map(([name, Icon]) => (
        <View key={name} style={styles.cell}>
          <Icon color={palette.chalk} size={28} />
          <Text style={styles.label}>{name.replace(/Icon$/, '')}</Text>
        </View>
      ))}
    </ScrollView>
  ),
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  cell: { width: '30%', flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  label: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
});
