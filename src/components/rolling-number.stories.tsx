import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RollingNumber } from '@/components/rolling-number';
import { fonts, palette, withAlpha } from '@/lib/theme';

const meta = {
  title: 'Live data/RollingNumber',
  component: RollingNumber,
  args: { value: 107, fontSize: 56 },
  argTypes: { value: { control: 'number' }, fontSize: { control: 'number' } },
  render: (args) => <RollingNumber {...args} style={{ fontFamily: fonts.display, color: palette.chalk }} />,
} satisfies Meta<typeof RollingNumber>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Scoreboard() {
  const [score, setScore] = useState(98);
  const btn = { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: withAlpha(palette.chalk, 0.12) };
  return (
    <View style={{ alignItems: 'center', gap: 20 }}>
      <RollingNumber value={score} fontSize={72} style={{ fontFamily: fonts.display, color: palette.chalk }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3].map((n) => (
          <Pressable key={n} onPress={() => setScore((s) => s + n)} style={btn}>
            <Text style={{ color: palette.chalk, fontFamily: fonts.bodyBold }}>+{n}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setScore(98)} style={btn}>
          <Text style={{ color: palette.muted, fontFamily: fonts.bodySemi }}>Reset</Text>
        </Pressable>
      </View>
      <Text style={{ color: palette.muted, fontFamily: fonts.body }}>Cross 100 to see a third reel appear.</Text>
    </View>
  );
}

/** Tap the buttons: each digit spins independently, like a scoreboard. */
export const Playable: Story = { render: () => <Scoreboard /> };
