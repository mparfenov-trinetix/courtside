import { useState } from 'react';
import { View } from 'react-native';

import { CupContent } from '../../components';
import { SeasonButton, SeasonSheet , ScreenHeader } from '@/components';
import { currentSeason } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { CUP_FROM } from './constants';

export function CupScreen() {
  const [season, setSeason] = useState(currentSeason());
  const [picking, setPicking] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="NBA Cup" color={palette.chalk} right={<SeasonButton season={season} onPress={() => setPicking(true)} />} />
      <CupContent key={season} season={season} />
      <SeasonSheet from={CUP_FROM} visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
