import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { summarizePicks, type GamePick } from '@/lib/league';
import { PickBadge } from '@/components';
import { PickRecord } from './PickRecord';

const meta = { title: "Pick'em/Score card" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const side = (id: string, abbr: string) => ({ id, abbr, logo: '' });
const pick = (n: number, teamId: string, winnerId?: string, favoriteId?: string): GamePick => ({
  id: `g${n}`,
  date: `2026-11-${String(n).padStart(2, '0')}T00:30Z`,
  away: side('a', 'BOS'),
  home: side('h', 'NYK'),
  teamId,
  madeAt: 0,
  winnerId,
  favoriteId,
});

const RUN: GamePick[] = [
  pick(1, 'a', 'a', 'a'),
  pick(2, 'a', 'h', 'h'),
  pick(3, 'h', 'h', 'h'),
  pick(4, 'a', 'a', 'h'),
  pick(5, 'h', 'h', 'a'),
  pick(6, 'a', 'a', 'a'),
  pick(7, 'h'),
];

export const WithResults: Story = { render: () => <View style={{ padding: 16 }}><PickRecord summary={summarizePicks(RUN)} /></View> };
export const FirstPick: Story = { render: () => <View style={{ padding: 16 }}><PickRecord summary={summarizePicks([pick(1, 'a')])} /></View> };

export const Badges: Story = {
  render: () => (
    <View style={{ padding: 16, gap: 12, flexDirection: 'row' }}>
      <PickBadge pick={pick(1, 'a')} />
      <PickBadge pick={pick(2, 'a', 'a')} />
      <PickBadge pick={pick(3, 'a', 'h')} />
    </View>
  ),
};
