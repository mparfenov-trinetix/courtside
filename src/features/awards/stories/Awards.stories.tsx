import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { AwardSection, AwardsHero } from '../components';
import awardsJson from '../../../../tests/fixtures/season-awards.json';
import { normalizeSeasonAwards } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { away, home } from '@/storybook/fixtures';

const meta = { title: 'Awards' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Real award records, trimmed: 2025 holds the main awards and three teams of five; 1996 and 1980 are the early years' names.
const season = (year: 2025 | 1996 | 1980) => {
  const f = awardsJson[String(year) as '2025' | '1996' | '1980'];
  return normalizeSeasonAwards(year, f.awards as never, f.athletes as never);
};
// The fixture game's two teams stand in for the team list.
const teamOf = (id?: string) => [home.team, away.team].find((t) => t.id === id);

const Page = ({ year }: { year: 2025 | 1996 | 1980 }) => {
  const awards = season(year);
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScrollView contentContainerStyle={{ paddingVertical: 24 }}>
        <AwardsHero awards={awards} teamOf={teamOf} />
        {awards.groups.map((g) => (
          <AwardSection key={g.key} group={g} teamOf={teamOf} />
        ))}
      </ScrollView>
    </View>
  );
};

/** 2025-26: the main awards, the playoffs' MVPs, All-NBA, All-Defensive, All-Rookie and the Cup. */
export const Recent: Story = { render: () => <Page year={2025} /> };

/** 1995-96: Jordan's MVP, the early years' All-NBA first team. */
export const Nineties: Story = { render: () => <Page year={1996} /> };
