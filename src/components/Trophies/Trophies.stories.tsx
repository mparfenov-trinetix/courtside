import type { Meta, StoryObj } from '@storybook/react-native';
import { StyleSheet, Text, View } from 'react-native';

import { CupIcon, LarryOBrienIcon } from '../Icons';
import { ConferenceMvpTrophyIcon, DpoyTrophyIcon, FinalsMvpTrophyIcon, MvpTrophyIcon, RoyTrophyIcon } from './Trophies';
import { fonts, palette, withAlpha } from '@/lib/theme';

const meta = { title: 'Foundations/Trophies' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ALL = [
  ['Champion', LarryOBrienIcon],
  ['NBA Cup', CupIcon],
  ['MVP', MvpTrophyIcon],
  ['Finals MVP', FinalsMvpTrophyIcon],
  ['Conf. finals MVP', ConferenceMvpTrophyIcon],
  ['DPOY', DpoyTrophyIcon],
  ['ROY', RoyTrophyIcon],
] as const;

/** The award trophies of the player card, big and at badge size (18 pt). */
export const Gallery: Story = {
  render: () => (
    <View style={styles.grid}>
      {ALL.map(([name, Icon]) => (
        <View key={name} style={styles.cell}>
          <Icon color="#FBBF24" size={64} />
          <View style={styles.small}>
            <Icon color="#FBBF24" size={18} />
          </View>
          <Text style={styles.label}>{name}</Text>
        </View>
      ))}
    </View>
  ),
};

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, alignContent: 'center', backgroundColor: palette.arena },
  cell: { width: '30%', flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  small: { height: 24, paddingHorizontal: 10, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.55)' },
  label: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
});
