import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components';
import { favoriteOf, isPickableKind, resultOf, winnerFromScores, type PickableGame } from '@/lib/league';
import type { GameKind, Pregame } from '@/lib/espn';
import { fonts, fontSize, palette, space } from '@/lib/theme';
import { settleStoredPicks, usePick } from '@/state';
import { PickButtons } from '../PickButtons';

type Side = { id: string; abbr: string; logo: string; color: string };

/**
 * "Your pick" on the game page. Before tip-off: the two buttons (with ESPN's win chance and who is favored), and the pick can be
 * changed until the game starts. Once it has started the card is only there if you picked, and it says how that went. A finished game
 * also settles the pick (from its own score), so the record is right the moment you open the game.
 */
export function PickCard({
  gameId,
  date,
  away,
  home,
  kind,
  pregame,
  scores,
  completed,
  started,
}: {
  gameId: string;
  date?: string;
  away: Side;
  home: Side;
  kind: GameKind;
  pregame?: Pick<Pregame, 'winProb' | 'odds'>;
  scores?: { away?: number; home?: number };
  completed: boolean;
  started: boolean;
}) {
  const pick = usePick(gameId);
  const winner = completed ? winnerFromScores({ id: away.id, score: scores?.away }, { id: home.id, score: scores?.home }) : undefined;
  useEffect(() => {
    if (winner && pick && !pick.winnerId) settleStoredPicks({ [gameId]: winner });
  }, [winner, pick, gameId]);

  if (!date || !isPickableKind(kind)) return null;
  // A game that is on or over has no use for the buttons unless there is a pick to show.
  if (started && !pick) return null;

  const game: PickableGame = {
    id: gameId,
    date,
    away: { id: away.id, abbr: away.abbr, logo: away.logo },
    home: { id: home.id, abbr: home.abbr, logo: home.logo },
  };
  const favoriteId = pick?.favoriteId ?? favoriteOf(away.id, home.id, pregame);
  const picked = pick ? (pick.teamId === home.id ? home : away) : undefined;
  const result = pick ? resultOf(pick) : 'pending';
  const upset = result === 'win' && !!pick?.favoriteId && pick.favoriteId !== pick.teamId;

  let line = 'Pick before tip-off. Your picks are kept on this phone.';
  let tone: string = palette.muted;
  if (picked && !started) line = `You picked ${picked.abbr}. You can change it until tip-off.`;
  if (picked && started && result === 'pending') line = `You picked ${picked.abbr}. Waiting for the final.`;
  if (result === 'win') {
    line = upset ? `You called it, and the underdog.` : 'You called it.';
    tone = palette.win;
  }
  if (result === 'loss') {
    line = `Not this time: ${picked?.abbr} lost.`;
    tone = palette.loss;
  }

  return (
    <View style={styles.wrap}>
      <SectionLabel style={styles.label}>Who will win?</SectionLabel>
      <Card>
        <PickButtons game={game} colors={{ away: away.color, home: home.color }} favoriteId={favoriteId} />
        <Text style={[styles.line, { color: tone }]}>{line}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  label: { marginBottom: space.sm },
  line: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, marginTop: space.md, textAlign: 'center' },
});
