import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSkeleton } from '@/components';
import { usePlayerGameLogs } from '@/hooks';
import { fetchGameSummary, type GameLogEntry, type LeaderEntry, type Team } from '@/lib/espn';
import { formatRating, gameRating, gameScore } from '@/lib/game';
import { fonts, palette, ratingTone, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

import { useLeaderPool } from '../../utils';
import { PlayerLine } from '../PlayerLine';
import { READABLE } from '@/lib/layout';

/** How many games are shown, and how many of the best-looking ones get their box score read to be sure (the log has no offensive / defensive split). */
const SHOWN = 10;
const CANDIDATES = 24;
const MIN_MINUTES = 15;

const madeOf = (value: string): [number, number] => {
  const m = /^(\d+)-(\d+)$/.exec(value.trim());
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
};

/**
 * Game Score from a game-log line. The log has total rebounds only, not offensive and defensive, so each rebound counts 0.4 (a quarter of
 * rebounds are offensive: 0.7 x 0.25 + 0.3 x 0.75): close enough to pick the games whose box score is worth reading for the exact one.
 */
function approxScore(g: GameLogEntry): number {
  const [fgm, fga] = madeOf(g.fg);
  const [ftm, fta] = madeOf(g.ft);
  return g.pts + 0.4 * fgm - 0.7 * fga - 0.4 * (fta - ftm) + 0.4 * g.reb + g.stl + 0.7 * g.ast + 0.7 * g.blk - 0.4 * g.pf - g.to;
}

type Candidate = { who: LeaderEntry; game: GameLogEntry };

/**
 * The best single games of the season by the Courtside Rating, among the league's top scorers, rebounders and passers: their game logs pick the
 * games that look biggest, and the box scores of those (the same cached reads the game page uses) give the exact rating. ESPN has no such list.
 */
export function BestGames({ teams }: { teams?: Team[] }) {
  const insets = useSafeAreaInsets();
  const { pool, pending } = useLeaderPool();
  const logs = usePlayerGameLogs(pool.map((p) => p.athleteId));
  const logsLoading = pending || logs.some((q) => q.isPending);

  const candidates: Candidate[] = logsLoading
    ? []
    : pool
        .flatMap((who, i) => (logs[i].data ?? []).filter((g) => g.result && g.min >= MIN_MINUTES).map((game): Candidate => ({ who, game })))
        .sort((a, b) => approxScore(b.game) - approxScore(a.game))
        .slice(0, CANDIDATES);
  const gameIds = [...new Set(candidates.map((c) => c.game.gameId))];

  const summaries = useQueries({
    queries: gameIds.map((id) => ({
      queryKey: ['game', id],
      queryFn: () => fetchGameSummary(id),
      // A finished game never changes; one still on is read afresh.
      staleTime: (q: { state: { data?: { completed: boolean } } }) => (q.state.data?.completed ? Infinity : 60_000),
    })),
  });
  if (logsLoading || summaries.some((q) => q.isPending)) return <ListSkeleton count={8} />;

  const byGame = new Map(gameIds.map((id, i) => [id, summaries[i].data]));
  const rows = candidates
    .flatMap(({ who, game }) => {
      const summary = byGame.get(game.gameId);
      if (!summary?.completed) return [];
      const line = [...summary.home.starters, ...summary.home.bench, ...summary.away.starters, ...summary.away.bench].find((p) => p.id === who.athleteId);
      if (!line || line.didNotPlay) return [];
      const score = gameScore(line.stats);
      const rating = gameRating(line.stats);
      return score === undefined || rating === undefined ? [] : [{ who, game, line: line.stats, score, rating }];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, SHOWN);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[READABLE, { paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 8 }]}>
      <Text style={styles.note}>
        The best single games of the season by Courtside Rating, among the league&apos;s top scorers, rebounders and passers. The rating stops at 10,
        so they are ranked by the raw Game Score under it.
      </Text>
      {rows.map(({ who, game, line, rating, score }, i) => (
        <Pressable
          key={`${who.athleteId}-${game.gameId}`}
          onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.gameId } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
          <View style={styles.headshotWrap}>
            {who.headshot ? <Image source={who.headshot} style={styles.headshot} contentFit="cover" transition={100} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {who.name}
            </Text>
            <PlayerLine team={teams?.find((t) => t.id === who.teamId)}>
              {game.home ? 'vs' : '@'} {game.opponent} · {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {game.result}{' '}
              {game.teamScore}–{game.opponentScore}
            </PlayerLine>
            <Text style={styles.line} numberOfLines={1}>
              {line.PTS} pts · {line.REB} reb · {line.AST} ast
            </Text>
          </View>
          <View style={styles.ratingCol}>
            <View style={[styles.rating, { backgroundColor: ratingTone(rating).background }]}>
              <Text style={styles.ratingText}>{formatRating(rating)}</Text>
            </View>
            {/* The rating stops at 10, which the best games all reach, so the raw Game Score under it is what they are ranked by. */}
            <Text style={styles.raw}>{score.toFixed(1)}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.muted, marginTop: 4, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: surfaces.card },
  rank: { width: 22, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted, textAlign: 'center' },
  rankTop: { color: palette.chalk, fontFamily: fonts.bodyBold },
  headshotWrap: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  headshot: { width: 56, height: 48 },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  line: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.chalk, marginTop: 2 },
  ratingCol: { alignItems: 'center', gap: 3 },
  rating: { width: 46, height: 40, alignItems: 'center', justifyContent: 'center' },
  raw: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  ratingText: { fontFamily: fonts.display, fontSize: 24, color: '#FFFFFF' },
});
