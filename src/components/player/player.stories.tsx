import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { CareerTable } from '@/components/player/career-table';
import { FormCard, SplitsCard } from '@/components/player/form-card';
import { careerRows, gameLog } from '@/storybook/fixtures';
import { palette } from '@/lib/theme';

const meta = { title: 'Player' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ACCENT = '#F5B942';

/** Last ten points with a hot/cold read; L5, L10 and season averages below. */
export const Form: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
      <FormCard log={gameLog} accent={ACCENT} />
    </ScrollView>
  ),
};

/** The same player gone cold: the last five games well below the season. */
export const FormCold: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
      <FormCard log={gameLog.map((g, i) => ({ ...g, pts: i < 5 ? Math.max(4, g.pts - 18) : g.pts }))} accent={ACCENT} />
    </ScrollView>
  ),
};

export const Splits: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
      <SplitsCard log={gameLog} />
    </ScrollView>
  ),
};

/** Per-game career table; a traded season gets a combined "Combined" row. Tap a column to sort. */
export const Career: Story = {
  render: () => (
    <View style={{ paddingHorizontal: 16, flex: 1, backgroundColor: palette.arena }}>
      <CareerTable career={{ seasons: careerRows, career: careerRows[careerRows.length - 1].stats }} accent={ACCENT} />
    </View>
  ),
};
