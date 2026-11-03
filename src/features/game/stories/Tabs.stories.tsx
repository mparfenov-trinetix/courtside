import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { BoxScoreTab, PlayByPlay, ShotChart, GameStickyBar, type GameTab } from '../components';
import { buildPeriodOptions } from '@/lib/game';
import { mix, palette } from '@/lib/theme';
import { away, awayColor, home, homeColor, plays } from '@/storybook/fixtures';

const meta = { title: 'Game/Tabs' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function StickyDemo() {
  const [tab, setTab] = useState<GameTab>('summary');
  const [period, setPeriod] = useState('full');
  // Pinned, so the bar shows its team-colored surface.
  const pinned = useSharedValue(1);
  return (
    <GameStickyBar
      tab={tab}
      onTab={setTab}
      accent={homeColor}
      options={buildPeriodOptions(4)}
      optionKey={period}
      onOption={setPeriod}
      pinned={pinned}
      tint={[mix(palette.arena, awayColor, 0.34), mix(palette.arena, homeColor, 0.34)]}
    />
  );
}

/** The pinned tab bar with the sliding underline and the period filter. */
export const StickyBar: Story = { render: () => <StickyDemo /> };

export const BoxScore: Story = {
  render: () => (
    <ScrollView>
      <BoxScoreTab
        away={away}
        home={home}
        awayPlayers={[...away.starters, ...away.bench]}
        homePlayers={[...home.starters, ...home.bench]}
        totals={{ away: away.totals, home: home.totals }}
        filtered={false}
        periodLabel="Full"
        hasStarted
        derived={null}
        selPeriods={null}
      />
    </ScrollView>
  ),
};

export const PlayByPlayFeed: Story = {
  render: () => (
    <ScrollView>
      <PlayByPlay plays={plays} periods={null} home={home} away={away} homeColor={homeColor} awayColor={awayColor} />
    </ScrollView>
  ),
};

/** Toggle Shots / Heat under the court. */
export const Shots: Story = {
  render: () => (
    <ScrollView>
      <ShotChart plays={plays} periods={null} away={away} home={home} awayColor={awayColor} homeColor={homeColor} />
    </ScrollView>
  ),
};
