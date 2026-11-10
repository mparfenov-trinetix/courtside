import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { AllStarGames, AllStarPlayers, WeekendHero } from '../components';
import allStarJson from '../../../../tests/fixtures/all-star-weekends.json';
import { normalizeAllStarWeekend } from '@/lib/espn';
import { palette } from '@/lib/theme';

const meta = { title: 'All-Star Weekend' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Two real weekends: 2024 (East against West) and 2025 (four captains' teams: two semifinals and a final).
const weekend = (season: 2024 | 2025) => {
  const f = allStarJson[String(season) as '2024' | '2025'];
  return normalizeAllStarWeekend(season, f.scoreboard as never, f.summaries as never, [f.mvp as never]);
};

const Page = ({ season }: { season: 2024 | 2025 }) => {
  const w = weekend(season);
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScrollView contentContainerStyle={{ paddingVertical: 24 }}>
        <WeekendHero weekend={w} />
        <AllStarGames games={w.games} />
        <AllStarPlayers players={w.players} games={w.games} />
      </ScrollView>
    </View>
  );
};

/** East against West, 211-186, with Damian Lillard's MVP. */
export const EastAgainstWest: Story = { render: () => <Page season={2024} /> };

/** Captains' teams: two semifinals to 40 and a final, Curry's MVP. */
export const Tournament: Story = { render: () => <Page season={2025} /> };
