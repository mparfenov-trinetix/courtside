import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { ErrorState, LoadingState } from './Screen';

const meta = { title: 'Layout/States' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => (
    <View style={{ height: 240 }}>
      <LoadingState label="Loading standings" />
    </View>
  ),
};

export const Error: Story = {
  render: () => (
    <View style={{ height: 240 }}>
      <ErrorState message="ESPN returned 503" onRetry={() => {}} />
    </View>
  ),
};
