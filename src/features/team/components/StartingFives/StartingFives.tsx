import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel, Skeleton, SkeletonGroup } from '@/components';
import { useRecentStarts } from '@/hooks';
import type { Player } from '@/lib/espn';
import { lastNameOf, lineupsFrom } from '@/lib/league';
import { fonts, palette, withAlpha, type TeamTheme } from '@/lib/theme';

const SHOWN = 3;
const LOOKBACK = 10;

/**
 * The team's most used starting fives over its last ten finished games, with how often each started and what it did: from the box scores
 * (ESPN has no lineup feed; who started is what a box score does say). The most used is lit; a game that did not list five starters is left out.
 */
export function StartingFives({ teamId, players, theme, active }: { teamId: string; players: Player[]; theme: TeamTheme; active: boolean }) {
  const { games, total, done, pending } = useRecentStarts(teamId, active, LOOKBACK);
  const lineups = lineupsFrom(games).slice(0, SHOWN);
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <View>
      <View style={styles.head}>
        <SectionLabel>Starting fives</SectionLabel>
        {total > 0 ? <Text style={styles.sub}>{done < total ? `${done} of ${total} games read` : `last ${total} games`}</Text> : null}
      </View>
      {pending && lineups.length === 0 ? (
        <SkeletonGroup>
          <Card style={styles.card}>
            <Skeleton height={46} radius={12} />
            <Skeleton width="45%" height={13} />
          </Card>
        </SkeletonGroup>
      ) : lineups.length === 0 ? (
        <Card style={styles.card}>
          <Text style={styles.empty}>No finished games yet, so no lineups to show.</Text>
        </Card>
      ) : (
        lineups.map((l, i) => (
          <Card key={l.key} style={[styles.card, i === 0 && { borderWidth: 1, borderColor: withAlpha(theme.accent, 0.5) }]}>
            <View style={styles.fives}>
              {l.ids.map((id) => {
                const p = byId.get(id);
                return (
                  <View key={id} style={styles.one}>
                    <View style={[styles.face, { backgroundColor: withAlpha(theme.primary, 0.7) }]}>
                      {p?.headshot ? <Image source={p.headshot} style={styles.photo} contentFit="cover" /> : <Text style={styles.initial}>?</Text>}
                    </View>
                    <Text style={styles.last} numberOfLines={1}>
                      {p ? lastNameOf(p.name) : 'Left'}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.foot}>
              <Text style={[styles.tag, i === 0 && { color: theme.accent }]}>{i === 0 ? 'Most used' : `No. ${i + 1}`}</Text>
              <Text style={styles.record}>
                {l.games} game{l.games === 1 ? '' : 's'} · <Text style={{ color: palette.win }}>{l.wins}W</Text> <Text style={{ color: palette.loss }}>{l.games - l.wins}L</Text>
              </Text>
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  card: { gap: 10, marginBottom: 8, padding: 14 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: palette.muted },
  fives: { flexDirection: 'row', justifyContent: 'space-between' },
  one: { flex: 1, alignItems: 'center', gap: 4 },
  face: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: 58, height: 46 },
  initial: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  last: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.chalk, maxWidth: 62 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: palette.muted },
  record: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
});
