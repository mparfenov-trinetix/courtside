import type { Meta, StoryObj } from '@storybook/react-native';
import { Pressable, Text, View } from 'react-native';

import { DataHealthBanner } from './DataHealthBanner';
import { reportIssue } from '@/lib/data-health';
import { fonts, palette, withAlpha } from '@/lib/theme';

const meta = { title: 'Feedback/DataHealthBanner' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const btn = { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: withAlpha(palette.chalk, 0.12) };
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Pressable style={btn} onPress={() => reportIssue('standings', 'standings table is incomplete')}>
        <Text style={{ color: palette.chalk, fontFamily: fonts.bodySemi }}>Report a standings problem</Text>
      </Pressable>
      <Pressable style={btn} onPress={() => reportIssue('game', 'play-by-play missing')}>
        <Text style={{ color: palette.chalk, fontFamily: fonts.bodySemi }}>Report a game problem too</Text>
      </Pressable>
      <Pressable style={btn} onPress={() => { reportIssue('standings', null); reportIssue('game', null); }}>
        <Text style={{ color: palette.muted, fontFamily: fonts.bodySemi }}>Everything recovered</Text>
      </Pressable>
      <DataHealthBanner />
    </View>
  );
}

/** Appears when ESPN answers but a parser finds the data wrong; dismissable. */
export const Interactive: Story = { render: () => <Demo /> };
