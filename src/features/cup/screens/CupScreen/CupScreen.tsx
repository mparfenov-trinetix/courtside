import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CupContent } from '../../components';
import { SeasonButton, SeasonSheet, ScreenHeader, Spotlight } from '@/components';
import { currentSeason } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { goBack } from '@/navigation';
import { CUP_FROM } from './constants';

/**
 * The NBA Cup for a season. `pushed`: opened from a game (route `matchup-cup`), on top of it, for that game's season only (no season
 * picker), with `teams` (comma separated ids) lit up, on the groups or the knockout bracket (`view`); back returns to the game.
 */
export function CupScreen({ pushed = false }: { pushed?: boolean }) {
  const params = useLocalSearchParams<{ teams?: string; season?: string; view?: string }>();
  const spot = pushed ? (params.teams ?? '').split(',').filter(Boolean) : [];
  const [season, setSeason] = useState(pushed && params.season ? Number(params.season) : currentSeason());
  const [picking, setPicking] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader
        title="NBA Cup"
        color={palette.chalk}
        onBack={pushed ? goBack : undefined}
        right={pushed ? undefined : <SeasonButton season={season} onPress={() => setPicking(true)} />}
      />
      <Spotlight teams={spot}>
        <CupContent key={season} season={season} initialView={pushed && params.view === 'knockout' ? 'knockout' : 'groups'} />
      </Spotlight>
      <SeasonSheet from={CUP_FROM} visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
