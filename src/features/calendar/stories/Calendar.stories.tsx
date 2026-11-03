import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useRefresh } from '@/hooks';

import { AgendaView , MonthView, startOfMonth } from '../components';
import { SeasonSeries } from '@/features/team';
import { away, home, schedule } from '@/storybook/fixtures';

const meta = { title: 'Calendar' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function MonthDemo() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date(2026, 10, 1)));
  const [selected, setSelected] = useState(() => new Date(2026, 10, 4));
  return (
    <MonthView games={schedule} teamAbbr="PHI" accent="#E84855" cursor={cursor} onCursor={setCursor} selected={selected} onPick={setSelected} />
  );
}

/** A team's season as a month grid; game days show the opponent and are tinted by result. */
export const Month: Story = { render: () => <MonthDemo /> };

function AgendaDemo() {
  const refresh = useRefresh([['schedule']]);
  return (
    <View style={{ flex: 1 }}>
      <AgendaView games={schedule} teamAbbr="PHI" accent="#E84855" refreshControl={refresh} />
    </View>
  );
}

export const Agenda: Story = { render: () => <AgendaDemo /> };

export const SeasonSeriesCard: Story = {
  render: () => (
    <SeasonSeries
      schedule={schedule.map((g, i) => ({ ...g, opponentAbbr: i % 2 === 0 ? away.team.abbreviation : g.opponentAbbr }))}
      team={home.team}
      rival={away.team}
      accent="#E84855"
    />
  ),
};
