import type { Meta, StoryObj } from '@storybook/react-native';
import { Text, View } from 'react-native';

import { Collapsible } from '@/components/collapsible';
import { fonts, palette } from '@/lib/theme';

const meta = {
  title: 'Layout/Collapsible',
  component: Collapsible,
  // `children` is required by the type; the render function supplies the real content.
  args: { title: 'Injuries and game info', hint: '2 injuries', defaultOpen: false, children: null },
  argTypes: { defaultOpen: { control: 'boolean' }, title: { control: 'text' }, hint: { control: 'text' } },
  render: (args) => (
    <Collapsible {...args}>
      <View style={{ padding: 14, gap: 6 }}>
        <Text style={{ fontFamily: fonts.bodySemi, color: palette.chalk }}>Joel Embiid · C</Text>
        <Text style={{ fontFamily: fonts.body, color: palette.muted }}>Knee · back ~Nov 12</Text>
      </View>
    </Collapsible>
  ),
} satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
