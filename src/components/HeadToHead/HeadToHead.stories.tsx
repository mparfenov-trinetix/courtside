import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { HeadToHeadCard } from './HeadToHead';
import type { HeadToHeadGame } from '@/lib/espn';
import { away, awayColor, home, homeColor } from '@/storybook/fixtures';

const meta = { title: 'Matchup/Head to head' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const a = { id: away.team.id, abbr: away.team.abbreviation, logo: away.team.logoDark || away.team.logo, color: awayColor };
const b = { id: home.team.id, abbr: home.team.abbreviation, logo: home.team.logoDark || home.team.logo, color: homeColor };

const RESULTS: ['W' | 'L', number, number][] = [
  ['W', 112, 104], ['W', 121, 99], ['L', 98, 107], ['W', 115, 110], ['L', 101, 118],
  ['W', 109, 102], ['L', 95, 100], ['W', 130, 121], ['L', 104, 106], ['W', 117, 98],
];
const meetings: HeadToHeadGame[] = RESULTS.map(([result, teamScore, opponentScore], i) => ({
  id: String(i), date: new Date(Date.UTC(2026, 2 - i * 2, 12)).toISOString(), home: i % 2 === 0, opponent: b.abbr, opponentAbbr: b.abbr,
  opponentLogo: b.logo, opponentId: b.id, completed: true, result, teamScore, opponentScore,
}));

export const Ten: Story = {
  render: () => <View style={{ padding: 16 }}><HeadToHeadCard a={a} b={b} games={meetings} /></View>,
};
export const Two: Story = {
  render: () => <View style={{ padding: 16 }}><HeadToHeadCard a={a} b={b} games={meetings.slice(0, 2)} /></View>,
};
export const None: Story = {
  render: () => <View style={{ padding: 16 }}><HeadToHeadCard a={a} b={b} games={[]} /></View>,
};
