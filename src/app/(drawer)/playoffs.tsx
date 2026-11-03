import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Segmented, slideIn } from '@/components/segmented';
import { PlayInView, PlayoffsView } from '@/components/seasons/postseason-view';
import { SeasonButton, SeasonSheet } from '@/components/seasons/season-picker';
import { ScreenHeader } from '@/components/ui';
import { currentSeason } from '@/lib/espn';
import { palette } from '@/lib/theme';

type Pane = 'playoffs' | 'playin';
const PANES: { key: Pane; label: string }[] = [
  { key: 'playoffs', label: 'Playoffs' },
  { key: 'playin', label: 'Play-In' },
];

/** The playoff bracket and play-in games for any recent season. */
export default function Playoffs() {
  const [season, setSeason] = useState(currentSeason());
  const [pane, setPane] = useState<Pane>('playoffs');
  const [slide, setSlide] = useState<1 | -1>(1);
  const [picking, setPicking] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="Playoffs" color={palette.chalk} right={<SeasonButton season={season} onPress={() => setPicking(true)} />} />
      <Segmented
        options={PANES}
        value={pane}
        segmentWidth={110}
        onChange={(key, direction) => {
          setSlide(direction);
          setPane(key);
        }}
      />
      <Animated.View key={`${pane}-${season}`} entering={slideIn(slide)} style={{ flex: 1 }}>
        {pane === 'playoffs' ? <PlayoffsView season={season} /> : <PlayInView season={season} />}
      </Animated.View>
      <SeasonSheet visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
