import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Segmented, slideIn, ScreenHeader, SeasonButton, SeasonSheet, Spotlight } from '@/components';
import { PlayInView, PlayoffsView } from '../../components';
import { currentSeason } from '@/lib/espn';
import { hasPlayIn } from '@/lib/league';
import { palette } from '@/lib/theme';
import { goBack } from '@/navigation';
import { PLAYOFFS_FROM } from './constants';

type Pane = 'playoffs' | 'playin';
const PANES: { key: Pane; label: string }[] = [
  { key: 'playoffs', label: 'Playoffs' },
  { key: 'playin', label: 'Play-In' },
];

/**
 * The playoff bracket and play-in games for any recent season. `pushed`: opened from a game (route `matchup-playoffs`), on top of
 * it, for that game's season only (no season picker), with `teams` (comma separated ids) lit up and the round or pane they are in
 * showing; the back arrow returns to the game.
 */
export function PlayoffsScreen({ pushed = false }: { pushed?: boolean }) {
  const params = useLocalSearchParams<{ teams?: string; season?: string; pane?: string }>();
  const spot = pushed ? (params.teams ?? '').split(',').filter(Boolean) : [];
  const [season, setSeason] = useState(pushed && params.season ? Number(params.season) : currentSeason());
  const [picked, setPane] = useState<Pane>(pushed && params.pane === 'playin' ? 'playin' : 'playoffs');
  // No play-in before 2020-21: no switcher, just the bracket.
  const playIn = hasPlayIn(season);
  const pane: Pane = playIn ? picked : 'playoffs';
  const [slide, setSlide] = useState<1 | -1>(1);
  const [picking, setPicking] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader
        title="Playoffs"
        color={palette.chalk}
        onBack={pushed ? goBack : undefined}
        right={pushed ? undefined : <SeasonButton season={season} onPress={() => setPicking(true)} />}
      />
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
        <Spotlight teams={spot}>{pane === 'playoffs' ? <PlayoffsView season={season} /> : <PlayInView season={season} />}</Spotlight>
      </Animated.View>
      <SeasonSheet from={PLAYOFFS_FROM} visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
