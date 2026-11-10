import { useQueryClient } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { GameHighlights } from './GameHighlights';
import { palette } from '@/lib/theme';
import { away, home } from '@/storybook/fixtures';

const meta = { title: 'Game/Game highlights' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// The video of the card is put into the query cache, so the story needs no network but the picture and the player.
function Seeded({ found }: { found: boolean }) {
  const client = useQueryClient();
  const [gameId] = useState(() => {
    const id = found ? 'story-found' : 'story-missing';
    client.setQueryData(['gameRecapVideo', id], found ? { id: 'a8uStP5KNpk', title: 'Game Recap: Heat 114, Kings 108 (Nov. 8)', channelId: 'UCLd4dSmXdrJykO_hgOzbfPw' } : null);
    return id;
  });
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena, paddingTop: 24 }}>
      <GameHighlights gameId={gameId} away={away.team} home={home.team} awayScore={114} homeScore={108} clips={[]} date="2026-11-09T03:00Z" completed />
    </View>
  );
}

/** A finished game's YouTube video: a tap on the picture starts YouTube's own player in place. */
export const Found: Story = { render: () => <Seeded found /> };

/** The channel has none (yet): the card draws nothing, and the page below it does not move. */
export const NotPosted: Story = { render: () => <Seeded found={false} /> };
