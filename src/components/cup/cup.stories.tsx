import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { CupBadge } from '@/components/cup/cup-badge';
import { CupGameList } from '@/components/cup/cup-games';
import { GroupCard } from '@/components/cup/group-card';
import { buildCup, type Conference } from '@/lib/cup';
import type { CupGame } from '@/lib/espn';

const meta = { title: 'NBA Cup' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const side = (id: number, abbr: string, score?: number) => ({ teamId: String(id), abbr, logo: '', score });
const TEAMS = ['PHI', 'NY', 'BOS', 'CLE', 'ORL'];

// A five-team group mid-way through: six games played, four to come.
const games: CupGame[] = [];
let n = 0;
for (let a = 0; a < 5; a++) {
  for (let b = a + 1; b < 5; b++) {
    const played = n < 6;
    games.push({
      id: `s${n}`,
      date: `2026-11-${String(2 + n * 3).padStart(2, '0')}T00:30:00Z`,
      stage: 'Group Play',
      completed: played,
      home: side(a + 1, TEAMS[a], played ? 104 + ((n * 7) % 14) : undefined),
      away: side(b + 1, TEAMS[b], played ? 98 + ((n * 5) % 12) : undefined),
    });
    n++;
  }
}
const conf: Record<string, Conference> = { '1': 'east', '2': 'east', '3': 'east', '4': 'east', '5': 'east' };
const group = buildCup(games, conf).groups[0];

export const Badges: Story = {
  render: () => (
    <View style={{ padding: 16, gap: 12, alignItems: 'flex-start' }}>
      <CupBadge stage="Group Play" />
      <CupBadge stage="Quarterfinals" />
      <CupBadge stage="Championship" />
    </View>
  ),
};

/** Ranked with the group leader marked; "LEFT" is group games still to play. Your team is highlighted. */
export const Group: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <GroupCard group={group} favoriteTeamId="2" />
    </ScrollView>
  ),
};

export const GameList: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <CupGameList games={games} favoriteTeamId="1" showStage />
    </ScrollView>
  ),
};
