import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components';
import type { PeriodOption } from '@/lib/game';

/**
 * The period filter (Full, Q1 to Q4, 1H, 2H) as a row of chips. It lives in the pinned bar under the tabs on the Box score, Plays and
 * Shots tabs, and on a finished game's Summary tab it sits in the page itself, right above the sections it filters (the highlights above it
 * are not filtered, and the bar used to put the pills on one side of them and the stats on the other).
 */
export function PeriodChips({ options, activeKey, onChange }: { options: PeriodOption[]; activeKey: string; onChange: (key: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.chips}>
      {options.map((o) => (
        <Chip
          key={o.key}
          active={o.key === activeKey}
          label={o.label}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(o.key);
          }}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  chips: { gap: 6, paddingHorizontal: 16 },
});
