import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { TeamPills } from '../components';
import { away, home } from '@/storybook/fixtures';

const meta = { title: 'Team' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const teams = [away.team, home.team];

function PillsDemo() {
  const [selected, setSelected] = useState(0);
  const page = useSharedValue(0);
  return (
    <View style={{ paddingTop: 16 }}>
      <TeamPills
        teams={teams}
        page={page}
        selected={selected}
        onSelect={(i) => {
          setSelected(i);
          page.set(withTiming(i, { duration: 250 }));
        }}
      />
    </View>
  );
}

/** The roster screen's team strip: tap a pill and the outline moves to it. */
export const Pills: Story = { render: () => <PillsDemo /> };
