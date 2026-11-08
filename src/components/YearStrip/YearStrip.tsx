import { ScrollView } from 'react-native';

import { Chip } from '../Chip';
import { palette, space } from '@/lib/theme';

/** A strip of years, newest first (the All-Star and Draft screens): one chip each, the chosen one lit in gold. */
export function YearStrip({ seasons, value, onChange }: { seasons: number[]; value: number; onChange: (season: number) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Fixed height: a horizontal list beside a flexing page is squeezed by it, which cut the chips in half.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingVertical: space.sm }}>
      {seasons.map((s) => (
        <Chip key={s} size="md" label={String(s)} active={s === value} color={palette.gold} onPress={() => onChange(s)} accessibilityLabel={String(s)} />
      ))}
    </ScrollView>
  );
}
