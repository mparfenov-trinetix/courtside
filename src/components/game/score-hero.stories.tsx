import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

import { GameTopBar, LivePill, ScoreHero } from '@/components/game/score-hero';
import { fonts, mix, palette } from '@/lib/theme';
import { away, awayColor, home, homeColor } from '@/storybook/fixtures';

const meta = { title: 'Game/Header' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Final: Story = {
  render: () => (
    <ScoreHero away={away} home={home} status="Final" live={false} completed hasStarted periodCount={4} selPeriods={null} />
  ),
};

export const Live: Story = {
  render: () => (
    <ScoreHero away={away} home={home} status="5:41 - 2nd" live completed={false} hasStarted periodCount={2} selPeriods={null} />
  ),
};

export const QuarterSelected: Story = {
  render: () => (
    <ScoreHero away={away} home={home} status="Final" live={false} completed hasStarted periodCount={4} selPeriods={[3]} />
  ),
};

export const NotStarted: Story = {
  render: () => (
    <ScoreHero away={{ ...away, score: 0, linescores: [] }} home={{ ...home, score: 0, linescores: [] }} status="Thu, Nov 5 at 1:00 AM" live={false} completed={false} hasStarted={false} periodCount={0} selPeriods={null} />
  ),
};

export const LiveBadge: Story = { render: () => <View style={{ alignItems: 'center' }}><LivePill label="8:13 - 4th" /></View> };

function TopBarDemo({ live }: { live: boolean }) {
  const scrollY = useSharedValue(0);
  const [value, setValue] = useState(0);
  // Fades in as the slider passes the hero, like the real bar does when the tabs pin.
  const pinned = useDerivedValue(() => Math.min(1, Math.max(0, (scrollY.get() - 90) / 60)));
  const [updatedAt] = useState(() => Date.now() - 12000);
  return (
    <View>
      <GameTopBar scrollY={scrollY} away={away} home={home} status={live ? '8:13 - 4th' : 'Final'} live={live} hasStarted updatedAt={updatedAt} tint={[mix(palette.arena, awayColor, 0.34), mix(palette.arena, homeColor, 0.34)]} pinned={pinned} />
      <View style={{ padding: 20, gap: 8 }}>
        <Text style={{ fontFamily: fonts.bodySemi, color: palette.muted }}>Scroll position: {Math.round(value)}px</Text>
        <Slider
          minimumValue={0}
          maximumValue={160}
          value={value}
          onValueChange={(v) => {
            setValue(v);
            scrollY.set(v);
          }}
          minimumTrackTintColor={palette.chalk}
        />
        <Text style={{ fontFamily: fonts.body, color: palette.muted, fontSize: 12 }}>
          Drag to scroll past the big header: the matchup label turns into a compact scoreboard.
        </Text>
      </View>
    </View>
  );
}

/** The slim top bar. Drag the slider to simulate scrolling. */
export const TopBarLive: Story = { render: () => <TopBarDemo live /> };
export const TopBarFinal: Story = { render: () => <TopBarDemo live={false} /> };
