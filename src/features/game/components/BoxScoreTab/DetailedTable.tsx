import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { LegendButton } from './LegendButton';
import { PlayerAvatar } from './PlayerAvatar';
import { RatingSquare } from './RatingSquare';
import { ScrollIndicator } from './ScrollIndicator';
import { SortHeader } from './SortHeader';
import { statStyle } from './statStyle';
import { DETAIL_COL_FULL, DETAIL_COL_SHRUNK, DETAIL_SHRINK_AT, GOLD, HEADER_H, HEADSHOT_SIZE, RATING_BOX, ROW_H, TOTALS_H } from './constants';
import { FlashOverlay } from '@/components';
import type { BoxScorePlayer } from '@/lib/espn';
import { COL_W, type Col, type SortDir } from '@/lib/game';
import { fonts, palette, surfaces, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

export type TableSort = { col: Col | null; dir: SortDir; onSort: (col: Col) => void };

const openPlayer = (player: BoxScorePlayer, teamId: string) =>
  player.id && openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId } });

const subline = (player: BoxScorePlayer) => [player.jersey, player.position].filter(Boolean).join(' ');

/**
 * The detailed view: every stat column. The player column (photo, name and the rating) is pinned on the left while the stats scroll
 * sideways; as they do it shrinks, the name is cut short and the rating stays beside it. A thin indicator under the column names shows
 * how far the stats have scrolled.
 */
export function DetailedTable({
  rows,
  cols,
  rated,
  teamId,
  totals,
  sort,
  background,
  periodKey,
  onLegend,
}: {
  rows: BoxScorePlayer[];
  cols: Col[];
  rated: boolean;
  teamId: string;
  /** The team's totals row; none when ESPN sends none. */
  totals?: Record<string, string>;
  sort: TableSort;
  /** Opaque color of the pinned column, so it matches the page behind the scrolling stats. */
  background: string;
  periodKey: string;
  onLegend: () => void;
}) {
  const statCols = cols.filter((c) => c !== 'CR');
  const contentWidth = statCols.reduce((sum, c) => sum + COL_W[c], 0) + 16;
  const hasTotals = !!totals && Object.keys(totals).length > 0;
  const scrollX = useSharedValue(0);
  const tableWidth = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });
  // A soft shadow on the pinned column's right edge, only once the stats have scrolled under it.
  const edge = useAnimatedStyle(() => ({ opacity: interpolate(scrollX.get(), [0, 14], [0, 1], Extrapolation.CLAMP) }));
  // The player column shrinks over the first stretch of the scroll.
  const pinnedStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.get(), [0, DETAIL_SHRINK_AT], [DETAIL_COL_FULL, DETAIL_COL_SHRUNK], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.table} onLayout={(e) => tableWidth.set(e.nativeEvent.layout.width)}>
      {/* Pinned: the player column */}
      <Animated.View style={[styles.pinned, pinnedStyle, { backgroundColor: background }]}>
        <View style={[styles.pinnedHeader, { height: HEADER_H }]}>
          <LegendButton onPress={onLegend} />
          {rated ? <SortHeader label="CR" active={sort.col === 'CR'} dir={sort.dir} onPress={() => sort.onSort('CR')} boxWidth={RATING_BOX} /> : null}
        </View>
        {rows.map((p, i) => (
          <Pressable
            key={p.id || String(i)}
            onPress={() => openPlayer(p, teamId)}
            accessibilityRole={p.id ? 'button' : 'none'}
            accessibilityLabel={`${p.name}${p.starter ? ', starter' : ''}`}
            style={({ pressed }) => [styles.playerCell, i % 2 === 1 && styles.shade, pressed && { opacity: 0.7 }]}>
            {p.starter && <View style={styles.starterEdge} />}
            <PlayerAvatar player={p} size={HEADSHOT_SIZE} />
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName} numberOfLines={1}>{p.shortName || p.name}</Text>
              {subline(p) ? <Text style={styles.playerPos} numberOfLines={1}>{subline(p)}</Text> : null}
            </View>
            {rated ? <RatingSquare value={p.stats.CR} /> : null}
          </Pressable>
        ))}
        {hasTotals && (
          <View style={[styles.totalsCell, { height: TOTALS_H }]}>
            <Text style={styles.totalsLabel}>TEAM</Text>
          </View>
        )}
        <Animated.View pointerEvents="none" style={[styles.edge, edge]}>
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>

      {/* Scrolls sideways: the stat columns */}
      <View style={styles.stats}>
        <Animated.ScrollView
          horizontal
          bounces={false}
          overScrollMode="never"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}>
          <View>
            <View style={[styles.statsRow, { height: HEADER_H }]}>
              {statCols.map((col) => (
                <SortHeader key={col} label={col} active={sort.col === col} dir={sort.dir} onPress={() => sort.onSort(col)} style={{ width: COL_W[col], alignItems: 'flex-end' }} />
              ))}
            </View>
            {rows.map((p, i) => (
              <View key={`${p.id || i}-${periodKey}`} style={[styles.statsRow, { height: ROW_H }, i % 2 === 1 && styles.shade]}>
                <FlashOverlay radius={8} signature={statCols.map((c) => p.stats[c] ?? '').join('|')} />
                {statCols.map((col) => (
                  <Text key={col} style={statStyle(col, p.stats[col])}>
                    {p.stats[col] ?? '–'}
                  </Text>
                ))}
              </View>
            ))}
            {hasTotals && (
              <View style={[styles.statsRow, styles.totalsRow, { height: TOTALS_H }]}>
                {statCols.map((col) => (
                  <Text key={col} style={[{ width: COL_W[col], textAlign: 'right' }, styles.totalsValue]}>
                    {totals?.[col] || '–'}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </Animated.ScrollView>
        <ScrollIndicator scrollX={scrollX} tableWidth={tableWidth} contentWidth={contentWidth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  table: { flexDirection: 'row' },
  pinned: { zIndex: 2 },
  pinnedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8 },
  edge: { position: 'absolute', top: 0, bottom: 0, right: -8, width: 8 },
  stats: { flex: 1 },
  playerCell: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 8 },
  starterEdge: { position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: GOLD },
  // Trailing padding lives in the rows, so the zebra shading runs to the screen edge.
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  shade: { backgroundColor: surfaces.faint },
  playerName: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  playerPos: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  totalsCell: { justifyContent: 'center', paddingLeft: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), marginTop: 2 },
  totalsRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), marginTop: 2 },
  totalsLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  totalsValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk },
});
