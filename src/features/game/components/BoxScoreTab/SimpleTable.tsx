import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LegendButton } from './LegendButton';
import { PlayerAvatar } from './PlayerAvatar';
import { RatingSquare } from './RatingSquare';
import { SortHeader } from './SortHeader';
import { statStyle } from './statStyle';
import type { TableSort } from './DetailedTable';
import { GOLD, HEADER_H, SIMPLE_AVATAR, SIMPLE_COL_W, SIMPLE_COLS, SIMPLE_RATING_BOX, SIMPLE_ROW_H, TOTALS_H } from './constants';
import { FlashOverlay } from '@/components';
import type { BoxScorePlayer } from '@/lib/espn';
import { positionName, type Col } from '@/lib/game';
import { fonts, palette, surfaces, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

const openPlayer = (player: BoxScorePlayer, teamId: string) =>
  player.id && openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId } });

/** "7 Forward": the jersey number and the position written out (the detailed view has the short "7 F"). */
const subline = (player: BoxScorePlayer) => [player.jersey, positionName(player.position)].filter(Boolean).join(' ');

/**
 * The default view: a bigger photo and name per player, a "Starter" tag on the starters' photos, and just the rating, points, rebounds and
 * assists, which fit the screen, so there is nothing to scroll. The detailed view has the rest.
 */
export function SimpleTable({
  rows,
  rated,
  teamId,
  totals,
  sort,
  periodKey,
  onLegend,
}: {
  rows: BoxScorePlayer[];
  rated: boolean;
  teamId: string;
  totals?: Record<string, string>;
  sort: TableSort;
  periodKey: string;
  onLegend: () => void;
}) {
  const cols: Col[] = SIMPLE_COLS.filter((c) => c !== 'CR' || rated);
  const hasTotals = !!totals && Object.keys(totals).length > 0;
  return (
    <View>
      <View style={[styles.header, { height: HEADER_H }]}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <LegendButton onPress={onLegend} />
        </View>
        {cols.map((col) => (
          <SortHeader
            key={col}
            label={col}
            active={sort.col === col}
            dir={sort.dir}
            onPress={() => sort.onSort(col)}
            style={{ width: SIMPLE_COL_W[col as keyof typeof SIMPLE_COL_W], alignItems: 'flex-end' }}
            boxWidth={col === 'CR' ? SIMPLE_RATING_BOX : undefined}
          />
        ))}
      </View>
      {rows.map((p, i) => (
        <Pressable
          key={`${p.id || i}-${periodKey}`}
          onPress={() => openPlayer(p, teamId)}
          accessibilityRole={p.id ? 'button' : 'none'}
          accessibilityLabel={`${p.name}${p.starter ? ', starter' : ''}`}
          style={({ pressed }) => [styles.row, i % 2 === 1 && styles.shade, pressed && { opacity: 0.7 }]}>
          <FlashOverlay radius={8} signature={cols.map((c) => p.stats[c] ?? '').join('|')} />
          {p.starter && <View style={styles.starterEdge} />}
          <PlayerAvatar player={p} size={SIMPLE_AVATAR} starterLabel />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{p.shortName || p.name}</Text>
            {subline(p) ? <Text style={styles.sub} numberOfLines={1}>{subline(p)}</Text> : null}
          </View>
          {/* The columns are one block, so the row's gap does not come between them and they stay under their names. */}
          <View style={styles.columns}>
            {cols.map((col) =>
              col === 'CR' ? (
                <View key={col} style={{ width: SIMPLE_COL_W.CR, alignItems: 'flex-end' }}>
                  <RatingSquare value={p.stats.CR} size={SIMPLE_RATING_BOX} fontSize={15} />
                </View>
              ) : (
                <Text key={col} style={statStyle(col, p.stats[col], 15, SIMPLE_COL_W[col as keyof typeof SIMPLE_COL_W])}>
                  {p.stats[col] ?? '–'}
                </Text>
              ),
            )}
          </View>
        </Pressable>
      ))}
      {hasTotals && (
        <View style={[styles.row, styles.totals, { height: TOTALS_H }]}>
          <Text style={[styles.totalsLabel, { flex: 1 }]}>TEAM</Text>
          <View style={styles.columns}>
            {cols.map((col) =>
              col === 'CR' ? (
                <View key={col} style={{ width: SIMPLE_COL_W.CR }} />
              ) : (
                <Text key={col} style={[{ width: SIMPLE_COL_W[col as keyof typeof SIMPLE_COL_W], textAlign: 'right' }, styles.totalsValue]}>
                  {totals?.[col] || '–'}
                </Text>
              ),
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  row: { height: SIMPLE_ROW_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  columns: { flexDirection: 'row', alignItems: 'center' },
  shade: { backgroundColor: surfaces.faint },
  starterEdge: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: GOLD },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 1 },
  totals: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), marginTop: 2 },
  totalsLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  totalsValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
});
