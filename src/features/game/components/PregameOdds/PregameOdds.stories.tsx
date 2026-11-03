import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { PregameOdds } from './PregameOdds';
import { away, awayColor, home, homeColor } from '@/storybook/fixtures';

const meta = { title: 'Matchup/Odds' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const a = { abbr: away.team.abbreviation, logo: away.team.logoDark || away.team.logo, color: awayColor };
const h = { abbr: home.team.abbreviation, logo: home.team.logoDark || home.team.logo, color: homeColor };

const Frame = ({ children }: { children: React.ReactNode }) => <View style={{ padding: 16 }}>{children}</View>;

export const WithOdds: Story = {
  render: () => (
    <Frame>
      <PregameOdds
        away={a}
        home={h}
        pregame={{
          winProb: { away: 46.5, home: 53.5 },
          odds: {
            provider: 'DraftKings',
            details: `${h.abbr} -1.5`,
            overUnder: 217.5,
            away: { moneyLine: 101, decimal: 2.01, favorite: false },
            home: { moneyLine: -119, decimal: 1.84, favorite: true },
          },
        }}
      />
    </Frame>
  ),
};

export const WinProbabilityOnly: Story = {
  render: () => (
    <Frame>
      <PregameOdds away={a} home={h} pregame={{ winProb: { away: 13.2, home: 86.8 } }} />
    </Frame>
  ),
};
