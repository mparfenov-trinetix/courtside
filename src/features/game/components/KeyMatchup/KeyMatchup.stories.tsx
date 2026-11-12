import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { palette } from '@/lib/theme';
import { away, home } from '@/storybook/fixtures';
import { KeyMatchupView } from './KeyMatchup';

const meta = { title: 'Game/Key matchup' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const star = (name: string, athleteId: string, jersey: string, ppg: string, rpg: string, apg: string) => ({ name, athleteId, jersey, ppg, rpg, apg, headshot: undefined });

/** Each team's best player face to face; the higher number of each pair is lit. Reload the story to see the cards fly in and meet. */
export const Duel: Story = {
  render: () => (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: palette.arena }}>
      <KeyMatchupView away={{ team: away.team, star: star('Jaylen Brown', '3917376', '7', '26.4', '6.1', '4.2') }} home={{ team: home.team, star: star('Jayson Tatum', '4065648', '0', '26.5', '6.0', '7.4') }} />
    </View>
  ),
};
