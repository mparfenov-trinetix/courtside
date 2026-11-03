import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MarginChart } from '../MarginChart';
import { WinProbability } from '../WinProbability';
import { Segmented } from '@/components';
import type { BoxScoreTeam, Play } from '@/lib/espn';
import type { Flow } from '@/lib/game';

type Mode = 'win' | 'margin';

const MODES = [
  { key: 'win', label: 'Win %' },
  { key: 'margin', label: 'Margin' },
] as { key: Mode; label: string }[];

/** One chart slot with a switch between win probability and the point margin. */
export function GameFlow({
  plays,
  winProb,
  flow,
  home,
  away,
  homeColor,
  awayColor,
  selected,
  live,
}: {
  plays: Play[];
  winProb: Record<string, number>;
  flow: Flow;
  home: BoxScoreTeam;
  away: BoxScoreTeam;
  homeColor: string;
  awayColor: string;
  selected: number[] | null;
  live: boolean;
}) {
  const hasWinProb = Object.keys(winProb).length > 0;
  const [mode, setMode] = useState<Mode>(hasWinProb ? 'win' : 'margin');
  const active: Mode = hasWinProb ? mode : 'margin';

  const switcher = hasWinProb ? (
    <View style={styles.switch}>
      <Segmented options={MODES} value={active} onChange={(key) => setMode(key)} segmentWidth={64} compact />
    </View>
  ) : undefined;

  return active === 'win' ? (
    <WinProbability
      plays={plays}
      winProb={winProb}
      home={home}
      away={away}
      homeColor={homeColor}
      awayColor={awayColor}
      selected={selected}
      live={live}
      titleSlot={switcher}
    />
  ) : (
    <MarginChart
      plays={plays}
      flow={flow}
      home={home}
      away={away}
      homeColor={homeColor}
      awayColor={awayColor}
      selected={selected}
      live={live}
      titleSlot={switcher ?? <View />}
    />
  );
}

const styles = StyleSheet.create({ switch: { alignSelf: 'flex-start' } });
