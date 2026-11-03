import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Segmented, slideIn } from '@/components/segmented';
import { fonts, palette } from '@/lib/theme';

const meta = { title: 'Controls/Segmented' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const DAY_VIEWS = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' },
  { key: 'agenda', label: 'Agenda' },
];

function Demo({ options, compact, segmentWidth }: { options: { key: string; label: string }[]; compact?: boolean; segmentWidth?: number }) {
  const [value, setValue] = useState(options[0].key);
  const [direction, setDirection] = useState<1 | -1>(1);
  return (
    <View style={{ gap: 24 }}>
      <Segmented
        options={options}
        value={value}
        compact={compact}
        segmentWidth={segmentWidth}
        onChange={(key, dir) => {
          setDirection(dir);
          setValue(key);
        }}
      />
      {/* The content below slides in from the side the pill moved toward. */}
      <Animated.View key={value} entering={slideIn(direction)} style={{ alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, color: palette.chalk }}>{value}</Text>
      </Animated.View>
    </View>
  );
}

export const ThreeOptions: Story = { render: () => <Demo options={DAY_VIEWS} /> };

export const TwoOptions: Story = {
  render: () =>
    <Demo
      options={[
        { key: 'players', label: 'Players' },
        { key: 'teams', label: 'Teams' },
      ]}
      segmentWidth={104}
    />,
};

export const Compact: Story = {
  render: () =>
    <Demo
      options={[
        { key: 'win', label: 'Win %' },
        { key: 'margin', label: 'Margin' },
      ]}
      compact
      segmentWidth={64}
    />,
};
