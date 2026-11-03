import type { Preview } from '@storybook/react-native';
import { View } from 'react-native';

import { palette } from '../src/lib/theme';

const preview: Preview = {
  decorators: [
    // Every story sits on the app's own background, so colors read the way they do in the app.
    (Story) => (
      <View style={{ flex: 1, backgroundColor: palette.arena, paddingTop: 12 }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
