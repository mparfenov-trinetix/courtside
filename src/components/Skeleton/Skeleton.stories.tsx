import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { Skeleton, SkeletonGroup } from './Skeleton';

const meta = { title: 'Feedback/Skeleton' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Group: Story = {
  render: () => (
    <SkeletonGroup style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="35%" height={11} />
        </View>
      </View>
      <Skeleton height={120} radius={16} />
    </SkeletonGroup>
  ),
};
