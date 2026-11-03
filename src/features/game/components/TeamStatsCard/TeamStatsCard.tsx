import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Expandable } from '@/components';
import { TeamStatBar } from '../TeamStatBar';
import type { StatBarConfig } from '@/lib/game';
import { fonts, palette } from '@/lib/theme';

/** The six numbers worth a glance, with everything else (and the four factors) one tap away. */
export function TeamStatsCard({
  awayAbbr,
  homeAbbr,
  awayColor,
  homeColor,
  primary,
  more,
  factors,
  note,
}: {
  awayAbbr: string;
  homeAbbr: string;
  awayColor: string;
  homeColor: string;
  primary: StatBarConfig[];
  more: StatBarConfig[];
  factors: StatBarConfig[];
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasMore = more.length + factors.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Team stats</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      <View style={styles.teamKey}>
        <Text style={[styles.teamKeyLabel, { color: awayColor }]}>{awayAbbr}</Text>
        <Text style={[styles.teamKeyLabel, { color: homeColor }]}>{homeAbbr}</Text>
      </View>
      {primary.map((s) => (
        <TeamStatBar key={s.label} {...s} awayColor={awayColor} homeColor={homeColor} />
      ))}

      <Expandable open={open}>
        <View>
          {more.map((s) => (
            <TeamStatBar key={s.label} {...s} awayColor={awayColor} homeColor={homeColor} />
          ))}
          {factors.length > 0 && (
            <>
              <Text style={[styles.title, styles.factorsTitle]}>Four factors</Text>
              {factors.map((s) => (
                <TeamStatBar key={s.label} {...s} awayColor={awayColor} homeColor={homeColor} />
              ))}
            </>
          )}
        </View>
      </Expandable>

      {hasMore && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setOpen((v) => !v);
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.toggle}>
          <Text style={styles.toggleText}>{open ? 'Show fewer stats' : 'Show all stats and four factors'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  factorsTitle: { marginTop: 8 },
  note: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  teamKey: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  teamKeyLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5 },
  toggle: { alignSelf: 'center', paddingVertical: 6, marginTop: 2 },
  toggleText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
});
