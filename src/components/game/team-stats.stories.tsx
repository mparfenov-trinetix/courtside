import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { TeamStatBar } from '@/components/game/team-stat-bar';
import { TeamStatsCard } from '@/components/game/team-stats-card';
import { buildFourFactors, buildKeyStats, buildMoreStats, numsFromTotals } from '@/lib/game-model';
import { away, awayColor, home, homeColor } from '@/storybook/fixtures';

const meta = { title: 'Game/Team stats' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const SingleBar: Story = {
  render: () => (
    <View style={{ paddingHorizontal: 16 }}>
      <TeamStatBar label="Field goals" away={0.43} home={0.55} awayText="43%" homeText="55%" awaySub="38/89" homeSub="46/84" awayColor={awayColor} homeColor={homeColor} />
      <TeamStatBar label="Turnovers" away={13} home={9} awayText="13" homeText="9" lowerIsBetter awayColor={awayColor} homeColor={homeColor} />
      <TeamStatBar label="Rebounds" away={42} home={42} awayText="42" homeText="42" awayColor={awayColor} homeColor={homeColor} />
    </View>
  ),
};

const a = numsFromTotals(away.totals)!;
const h = numsFromTotals(home.totals)!;

/** Six stats up front; the rest and the four factors open on tap. */
export const Card: Story = {
  render: () => (
    <TeamStatsCard
      awayAbbr={away.team.abbreviation}
      homeAbbr={home.team.abbreviation}
      awayColor={awayColor}
      homeColor={homeColor}
      primary={buildKeyStats(a, h)}
      more={buildMoreStats(a, h)}
      factors={buildFourFactors(a, h)}
    />
  ),
};

export const WithPeriodNote: Story = {
  render: () => (
    <TeamStatsCard
      awayAbbr={away.team.abbreviation}
      homeAbbr={home.team.abbreviation}
      awayColor={awayColor}
      homeColor={homeColor}
      primary={buildKeyStats(a, h)}
      more={[]}
      factors={[]}
      note="Q3 · from play-by-play"
    />
  ),
};
