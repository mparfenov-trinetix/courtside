import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { FormChips, FormDots, type FormChip } from './Form';

const meta = { title: 'Matchup/Form' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const games: FormChip[] = [
  { id: '1', result: 'W', teamScore: 106, opponentScore: 93, opponentAbbr: 'PHI', home: false },
  { id: '2', result: 'L', teamScore: 97, opponentScore: 111, opponentAbbr: 'NY', home: false },
  { id: '3', result: 'W', teamScore: 97, opponentScore: 89, opponentAbbr: 'CHA', home: true },
  { id: '4', result: 'W', teamScore: 110, opponentScore: 94, opponentAbbr: 'BKN', home: false },
  { id: '5', result: 'W', teamScore: 124, opponentScore: 91, opponentAbbr: 'CHA', home: false },
];

export const Dots: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 6, padding: 16 }}>
      <FormDots games={games} />
    </View>
  ),
};

export const Chips: Story = {
  render: () => (
    <View style={{ padding: 16 }}>
      <FormChips games={games} />
    </View>
  ),
};
