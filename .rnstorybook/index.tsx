import AsyncStorage from '@react-native-async-storage/async-storage';

import { view } from './storybook.requires';

/**
 * Storybook's UI, exported as a component so Expo Router can mount it at /storybook
 * (see src/app/storybook.tsx). Stories live next to the components in src/**.
 */
const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

export default StorybookUIRoot;
