import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { MiniSeries, MINI_H, MINI_W, SeriesCard } from '../SeriesCard';
import { SeriesSheet } from '../SeriesSheet';
import { Chip, ChipText, Segmented, slideIn, useSpotlight } from '@/components';
import { layoutTree, type BracketSection, type Round, type Series } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { COL_GAP, CONF_GAP, ROW_GAP, TAG_H } from './constants';

export type { BracketSection };

/**
 * A knockout bracket with two ways in. "Rounds" steps through the stages one at a time with big series
 * cards; "Bracket" draws the whole tree left to right. Either way, tap a series for its game-by-game results.
 */
export function Bracket({
  rounds,
  sections,
  favoriteTeamId,
  emptyText = 'Nothing has been scheduled yet.',
}: {
  rounds: Round[];
  sections: BracketSection[];
  favoriteTeamId?: string | null;
  emptyText?: string;
}) {
  const lit = useSpotlight();
  const spotted = (s: Series) => lit(s.top.teamId) && lit(s.bottom.teamId);
  // Opened from a game: on the drawn bracket, scrolled to that series, not on the list of rounds.
  const [mode, setMode] = useState<'rounds' | 'tree'>(() => (rounds.some((r) => r.series.some(spotted)) ? 'tree' : 'rounds'));
  const [roundKey, setRoundKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [open, setOpen] = useState<Series | null>(null);

  if (rounds.length === 0) return <Text style={styles.empty}>{emptyText}</Text>;

  // Opened from a game: on the round that series is in, otherwise on the latest round that has begun.
  const spotRound = rounds.find((r) => r.series.some(spotted));
  const active = rounds.find((r) => r.key === roundKey) ?? spotRound ?? rounds[rounds.length - 1];
  const activeIndex = rounds.indexOf(active);
  // Jump straight to the stage that matters: the latest round that has begun.
  const pick = (key: string) => {
    setDirection(rounds.findIndex((r) => r.key === key) > activeIndex ? 1 : -1);
    setRoundKey(key);
  };

  return (
    <View>
      <View style={styles.switch}>
        <Segmented
          options={[
            { key: 'rounds', label: 'Rounds' },
            { key: 'tree', label: 'Bracket' },
          ]}
          value={mode}
          onChange={(k) => setMode(k)}
          segmentWidth={96}
          compact
        />
      </View>

      {mode === 'rounds' ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
            {rounds.map((r) => {
              const on = r.key === active.key;
              const done = r.series.every((s) => s.winnerId);
              return (
                <Chip key={r.key} size="md" active={on} onPress={() => pick(r.key)} style={{ paddingVertical: 7 }}>
                  <ChipText active={on} size="md">
                    {r.name}
                    <Text style={styles.chipCount}>{done ? '  ✓' : ''}</Text>
                  </ChipText>
                </Chip>
              );
            })}
          </ScrollView>

          <Animated.View key={active.key} entering={slideIn(direction)}>
            <RoundList round={active} favoriteTeamId={favoriteTeamId} onOpen={setOpen} />
          </Animated.View>
        </View>
      ) : (
        <Tree sections={sections} favoriteTeamId={favoriteTeamId} onOpen={setOpen} />
      )}

      <SeriesSheet series={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function RoundList({ round, favoriteTeamId, onOpen }: { round: Round; favoriteTeamId?: string | null; onOpen: (s: Series) => void }) {
  const confs = ['east', 'west', undefined] as const;
  const groups = confs
    .map((c) => ({ conf: c, series: round.series.filter((s) => s.conference === c) }))
    .filter((g) => g.series.length > 0);
  const labelled = groups.length > 1 || groups[0]?.conf != null;
  return (
    <View>
      {groups.map((g) => (
        <View key={String(g.conf)}>
          {labelled && g.conf ? <Text style={styles.confLabel}>{g.conf === 'east' ? 'Eastern Conference' : 'Western Conference'}</Text> : null}
          {g.series.map((s, i) => (
            <Animated.View key={s.id}>
              <SeriesCard series={s} favoriteTeamId={favoriteTeamId} onPress={() => onOpen(s)} />
            </Animated.View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Tree({ sections, favoriteTeamId, onOpen }: { sections: BracketSection[]; favoriteTeamId?: string | null; onOpen: (s: Series) => void }) {
  return (
    <View>
      <Text style={styles.hint}>Swipe sideways for later rounds. Tap a series for its games.</Text>
      {sections.map((section) => (
        <TreeSection key={section.title} section={section} favoriteTeamId={favoriteTeamId} onOpen={onOpen} />
      ))}
    </View>
  );
}

function TreeSection({ section, favoriteTeamId, onOpen }: { section: BracketSection; favoriteTeamId?: string | null; onOpen: (s: Series) => void }) {
  // East above West in one tree: leave room for their "East" / "West" tags and between the two halves.
  const { placements, height } = layoutTree(section.rounds, MINI_H, ROW_GAP, section.byConference ? { confGap: CONF_GAP, top: TAG_H } : undefined);
  const tags = section.byConference
    ? (['east', 'west'] as const).flatMap((c) => {
        const first = placements.find((p) => p.col === 0 && p.series.conference === c);
        return first ? [{ conf: c, y: first.y - TAG_H }] : [];
      })
    : [];
  const colX = (col: number) => col * (MINI_W + COL_GAP);
  // Opened from a game: the tree starts scrolled to the column of that game's series.
  const lit = useSpotlight();
  const spot = placements.find((p) => lit(p.series.top.teamId) && lit(p.series.bottom.teamId));
  const startX = spot ? Math.max(0, colX(spot.col) - 8) : 0;
  const width = section.rounds.length * (MINI_W + COL_GAP) - COL_GAP;
  const byId = new Map(placements.map((p) => [p.series.id, p]));

  // An elbow from each feeder's right edge to the series it fed; brighter along the winner's path.
  const links = placements.flatMap((p) => {
    if (p.col === 0) return [];
    const prev = section.rounds[p.col - 1].series;
    return prev
      .filter((f) => [f.top.teamId, f.bottom.teamId].some((id) => id === p.series.top.teamId || id === p.series.bottom.teamId))
      .map((f) => {
        const from = byId.get(f.id)!;
        const x1 = colX(from.col) + MINI_W;
        const y1 = from.y + MINI_H / 2;
        const x2 = colX(p.col);
        const y2 = p.y + MINI_H / 2;
        const xm = x1 + COL_GAP / 2;
        const advanced = !!f.winnerId && [p.series.top.teamId, p.series.bottom.teamId].includes(f.winnerId);
        return { key: `${f.id}>${p.series.id}`, d: `M${x1},${y1} H${xm} V${y2} H${x2}`, advanced };
      });
  });

  return (
    <View style={styles.section}>
      {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: startX, y: 0 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <View style={{ width, height: height + 22 }}>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {links.map((l) => (
              <Path key={l.key} d={l.d} fill="none" strokeWidth={1.5} stroke={l.advanced ? withAlpha(palette.chalk, 0.55) : withAlpha(palette.chalk, 0.16)} />
            ))}
          </Svg>
          {placements.map((p) => (
            <MiniSeries
              key={p.series.id}
              series={p.series}
              favoriteTeamId={favoriteTeamId}
              onPress={() => onOpen(p.series)}
              style={{ position: 'absolute', left: colX(p.col), top: p.y }}
            />
          ))}
          {tags.map((t) => (
            <Text key={t.conf} style={[styles.confTag, { top: t.y }]}>
              {t.conf === 'east' ? 'EAST' : 'WEST'}
            </Text>
          ))}
          {/* Round names scroll with the tree they label */}
          {section.rounds.map((r, i) => (
            <Text key={r.key} style={[styles.colName, { left: colX(i), top: height + 6 }]} numberOfLines={1}>
              {r.name}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', fontFamily: fonts.body, fontSize: 15, color: palette.muted, padding: 40 },
  switch: { alignItems: 'flex-start', marginBottom: 12 },
  chipScroll: { marginHorizontal: -16, flexGrow: 0, marginBottom: 12 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chipCount: { color: '#34D399' },
  confLabel: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: withAlpha(palette.chalk, 0.55), paddingTop: 6, paddingBottom: 8, paddingHorizontal: 4 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginBottom: 6 },
  section: { marginHorizontal: -16, marginTop: 12 },
  sectionTitle: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: withAlpha(palette.chalk, 0.55), paddingHorizontal: 20, paddingBottom: 8 },
  confTag: { position: 'absolute', left: 0, fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.6, color: withAlpha(palette.chalk, 0.55) },
  colName: { position: 'absolute', width: MINI_W, fontFamily: fonts.body, fontSize: 10, color: palette.muted, textAlign: 'center' },
});
