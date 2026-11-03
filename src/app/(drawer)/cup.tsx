import { useState } from 'react';
import { View } from 'react-native';

import { CupContent } from '@/components/cup/cup-content';
import { SeasonButton, SeasonSheet } from '@/components/seasons/season-picker';
import { ScreenHeader } from '@/components/ui';
import { currentSeason } from '@/lib/espn';
import { palette } from '@/lib/theme';

export default function CupScreen() {
  const [season, setSeason] = useState(currentSeason());
  const [picking, setPicking] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="NBA Cup" color={palette.chalk} right={<SeasonButton season={season} onPress={() => setPicking(true)} />} />
      <CupContent key={season} season={season} />
      <SeasonSheet visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
