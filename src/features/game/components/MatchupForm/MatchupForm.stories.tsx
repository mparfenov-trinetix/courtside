import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { MatchupForm } from './MatchupForm';
import type { FormGame } from '@/lib/espn';
import { away, awayColor, home, homeColor } from '@/storybook/fixtures';

const meta = { title: 'Matchup/Recent form' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const a = { id: away.team.id, abbr: away.team.abbreviation, logo: away.team.logoDark || away.team.logo, color: awayColor };
const h = { id: home.team.id, abbr: home.team.abbreviation, logo: home.team.logoDark || home.team.logo, color: homeColor };

const run = (results: ('W' | 'L')[]): FormGame[] =>
  results.map((result, i) => ({
    id: `${result}${i}`, date: `2026-10-2${i}`, result, teamScore: result === 'W' ? 112 : 99, opponentScore: result === 'W' ? 101 : 108,
    opponentAbbr: ['CHI', 'NY', 'BKN', 'IND', 'CHA'][i], opponentLogo: '', home: i % 2 === 0,
  }));

export const BothTeams: Story = {
  render: () => (
    <View style={{ padding: 16 }}>
      <MatchupForm away={a} home={h} form={{ [a.id]: run(['W', 'L', 'W', 'W', 'W']), [h.id]: run(['L', 'L', 'W', 'L', 'W']) }} />
    </View>
  ),
};
