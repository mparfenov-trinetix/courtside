import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';

import { Bracket } from './Bracket';
import { MiniSeries } from '../SeriesCard';
import { buildPlayoffs } from '@/lib/league';
import type { CupGame } from '@/lib/espn';

const meta = { title: 'Bracket' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const NAMES = ['', 'DET', 'BOS', 'NY', 'CLE', 'TOR', 'ATL', 'PHI', 'ORL'];
const side = (id: number, score?: number) => ({ teamId: String(id), abbr: NAMES[id], logo: '', score });
let n = 0;
const g = (stage: string, home: number, away: number, hs?: number, as?: number): CupGame => ({
  id: `b${n++}`,
  date: `2027-04-${String(18 + (n % 10)).padStart(2, '0')}T00:00Z`,
  stage,
  completed: hs != null,
  home: side(home, hs),
  away: side(away, as),
});

// East only: a finished first round, and a second round with one series under way.
const games: CupGame[] = [
  ...[[1, 8], [4, 5], [3, 6], [2, 7]].flatMap(([a, b]) => [
    g('East 1st Round - Game 1', a, b, 108, 99),
    g('East 1st Round - Game 2', a, b, 101, 104),
    g('East 1st Round - Game 3', b, a, 95, 110),
    g('East 1st Round - Game 4', b, a, 90, 102),
    g('East 1st Round - Game 5', a, b, 111, 100),
  ]),
  g('East Semifinals - Game 1', 1, 4, 105, 99),
  g('East Semifinals - Game 2', 1, 4, 98, 101),
  g('East Semifinals - Game 3', 4, 1, 100, 97),
  g('East Semifinals - Game 1', 3, 2, 112, 108),
  g('East Semifinals - Game 2', 3, 2),
];
const playoffs = buildPlayoffs(games, { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 });

/** Step through the rounds, or switch to the drawn bracket. Tap a series for its games. */
export const Full: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Bracket rounds={playoffs.rounds} sections={playoffs.sections} favoriteTeamId="3" onOpen={() => {}} />
    </ScrollView>
  ),
};

export const Empty: Story = {
  render: () => <Bracket rounds={[]} sections={[]} onOpen={() => {}} emptyText="The playoffs start in April." />,
};

export const MiniCards: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      {playoffs.rounds[1].series.map((s) => (
        <MiniSeries key={s.id} series={s} onPress={() => {}} />
      ))}
    </ScrollView>
  ),
};
