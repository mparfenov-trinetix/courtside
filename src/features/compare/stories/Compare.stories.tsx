import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { CompareRow , Radar } from '../components';

const meta = { title: 'Compare' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const AXES = [
  { label: 'Scoring', a: 0.9, b: 0.62 },
  { label: 'Rebounding', a: 0.35, b: 0.8 },
  { label: 'Playmaking', a: 0.7, b: 0.45 },
  { label: 'Steals', a: 0.5, b: 0.3 },
  { label: 'Blocks', a: 0.2, b: 0.75 },
  { label: 'Efficiency', a: 0.78, b: 0.7 },
];

/** Two shapes on shared spokes; wider means better on that spoke. */
export const RadarChart: Story = {
  render: () => <Radar axes={AXES} aColor="#E2B077" bColor="#60A5FA" aName="Player A" bName="Player B" />,
};

export const RadarFiveSpokes: Story = {
  render: () => <Radar axes={AXES.slice(0, 5)} aColor="#34D399" bColor="#F87171" size={300} />,
};

const fmt = (v: number) => v.toFixed(1);

export const Rows: Story = {
  render: () => (
    <ScrollView>
      <View style={{ padding: 16 }}>
        <CompareRow row={{ label: 'Points', a: 27.4, b: 22.1, fmt }} aColor="#E2B077" bColor="#60A5FA" delay={0} />
        <CompareRow row={{ label: 'Rebounds', a: 5.1, b: 9.3, fmt }} aColor="#E2B077" bColor="#60A5FA" delay={40} />
        {/* Lower is better: the smaller number wins and gets the bright bar. */}
        <CompareRow row={{ label: 'Turnovers', a: 3.1, b: 2.2, fmt, lowerBetter: true, aSub: '24th in NBA', bSub: '3rd in NBA' }} aColor="#E2B077" bColor="#60A5FA" delay={80} />
        <CompareRow row={{ label: 'Steals', a: 1.4, b: 1.4, fmt }} aColor="#E2B077" bColor="#60A5FA" delay={120} />
      </View>
    </ScrollView>
  ),
};
