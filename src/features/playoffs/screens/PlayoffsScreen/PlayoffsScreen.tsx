import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Segmented, slideIn, ScreenHeader , SeasonButton, SeasonSheet } from '@/components';
import { PlayInView, PlayoffsView } from '../../components';
import { currentSeason } from '@/lib/espn';
import { hasPlayIn } from '@/lib/league';
import { palette } from '@/lib/theme';
import { PLAYOFFS_FROM } from './constants';

type Pane = 'playoffs' | 'playin';
const PANES: { key: Pane; label: string }[] = [
  { key: 'playoffs', label: 'Playoffs' },
  { key: 'playin', label: 'Play-In' },
];

/** The playoff bracket and play-in games for any recent season. */
export function PlayoffsScreen() {
  const [season, setSeason] = useState(currentSeason());
  const [picked, setPane] = useState<Pane>('playoffs');
  // No play-in before 2020-21: no switcher, just the bracket.
  const playIn = hasPlayIn(season);
  const pane: Pane = playIn ? picked : 'playoffs';
  const [slide, setSlide] = useState<1 | -1>(1);
  const [picking, setPicking] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="Playoffs" color={palette.chalk} right={<SeasonButton season={season} onPress={() => setPicking(true)} />} />
      {playIn && (
        <Segmented
          style={{ marginBottom: 14 }}
          options={PANES}
          value={pane}
          segmentWidth={110}
          onChange={(key, direction) => {
            setSlide(direction);
            setPane(key);
          }}
        />
      )}
      <Animated.View key={`${pane}-${season}`} entering={slideIn(slide)} style={{ flex: 1 }}>
        {pane === 'playoffs' ? <PlayoffsView season={season} /> : <PlayInView season={season} />}
      </Animated.View>
      <SeasonSheet from={PLAYOFFS_FROM} visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
