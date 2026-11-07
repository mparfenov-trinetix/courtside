import type { Meta, StoryObj } from '@storybook/react-native';
import { View, useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { PlayerCard } from './PlayerCard';
import { playerCardSize } from './constants';
import { teamTheme } from '@/lib/theme';
import { home } from '@/storybook/fixtures';

const meta = { title: 'Player/PlayerCard' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const PLAYER = { name: 'Jaylen Sample', jersey: '7', position: 'SG', height: "6' 5\"", age: 26, headshot: undefined };
const STATS = { ppg: 24.6, rpg: 5.1, apg: 6.3, spg: 1.4, bpg: 0.6, mpg: 33.8 };

function Demo({ color, alternate, abbr }: { color?: string; alternate?: string; abbr?: string }) {
  const { width: screen } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const team = { ...home.team, ...(color ? { color, alternateColor: alternate ?? '#FFFFFF', abbreviation: abbr ?? home.team.abbreviation } : null) };
  const theme = teamTheme(team);
  const { width } = playerCardSize(screen);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <PlayerCard
        player={PLAYER}
        team={team}
        theme={theme}
        width={width}
        scrollY={scrollY}
        stats={STATS}
        titles={2}
        honors={[{ id: 'mvp', name: 'MVP', count: 2, seasons: [2024, 2025] }]}
      />
    </View>
  );
}

/** The player card with its glass tags, season line and badges (drag to tilt). */
export const Default: Story = { render: () => <Demo /> };
/** A black team: the edge in the secondary color keeps the card off the page. */
export const BlackTeam: Story = { render: () => <Demo color="#000000" alternate="#C4CED4" abbr="SA" /> };
/** A red team whose logo shares the card's color: drawn with the white outline. */
export const RedTeamOutlined: Story = { render: () => <Demo color="#CE1141" alternate="#C4CED4" abbr="HOU" /> };

