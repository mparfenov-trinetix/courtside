import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';

import { GameFlow , KeyMoments , LineupsCard , Timeouts } from '../components';
import { away, awayColor, derived, flow, home, homeColor, liveAway, liveHome, plays, winProb } from '@/storybook/fixtures';

const meta = { title: 'Game/Analysis' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const WinProbabilityAndMargin: Story = {
  render: () => (
    <GameFlow plays={plays} winProb={winProb} flow={flow} home={home} away={away} homeColor={homeColor} awayColor={awayColor} selected={null} live={false} />
  ),
};

export const QuarterHighlighted: Story = {
  render: () => (
    <GameFlow plays={plays} winProb={winProb} flow={flow} home={home} away={away} homeColor={homeColor} awayColor={awayColor} selected={[3]} live={false} />
  ),
};

export const MarginOnly: Story = {
  render: () => (
    <GameFlow plays={plays} winProb={{}} flow={flow} home={home} away={away} homeColor={homeColor} awayColor={awayColor} selected={null} live={false} />
  ),
};

export const Moments: Story = {
  render: () => <KeyMoments flow={flow} away={away} home={home} awayColor={awayColor} homeColor={homeColor} />,
};

/** A one-sided game collapses "0 lead changes, 0 ties" into a single "never trailed" tile. */
export const WireToWire: Story = {
  render: () => (
    <KeyMoments
      flow={{ ...flow, leadChanges: 0, ties: 0, largestAway: undefined, lastLeadChange: undefined }}
      away={away}
      home={home}
      awayColor={awayColor}
      homeColor={homeColor}
    />
  ),
};

export const TimeoutsFinal: Story = {
  render: () => <Timeouts away={away} home={home} plays={plays} live={false} awayColor={awayColor} homeColor={homeColor} />,
};

/** Live: pips show what's left, plus fouls this period and the bonus. */
export const TimeoutsLive: Story = {
  render: () => <Timeouts away={liveAway} home={liveHome} plays={plays} live awayColor={awayColor} homeColor={homeColor} />,
};

export const Lineups: Story = {
  render: () => (
    <ScrollView>
      <LineupsCard derived={derived} teamId={home.team.id} players={[...home.starters, ...home.bench]} periods={null} />
    </ScrollView>
  ),
};
