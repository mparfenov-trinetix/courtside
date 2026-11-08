import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CupBadge } from '../CupBadge';
import type { CupGame } from '@/lib/espn';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { openDetail } from '@/navigation';

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Cup games grouped by day. A team's own games are outlined. */
export function CupGameList({ games, favoriteTeamId, showStage = false }: { games: CupGame[]; favoriteTeamId?: string | null; showStage?: boolean }) {
  return (
    <View>
      {games.map((g, i) => {
        const day = dayLabel(g.date);
        const header = i === 0 || day !== dayLabel(games[i - 1].date);
        return (
          <View key={g.id}>
            {header && <Text style={styles.day}>{day}</Text>}
            <Animated.View>
              <GameRow game={g} mine={g.home.teamId === favoriteTeamId || g.away.teamId === favoriteTeamId} showStage={showStage} />
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

function GameRow({ game, mine, showStage }: { game: CupGame; mine: boolean; showStage: boolean }) {
  const done = game.completed && game.home.score != null && game.away.score != null;
  const homeWon = done && game.home.score! > game.away.score!;
  const time = new Date(game.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, mine && styles.mine, pressed && { opacity: 0.7 }]}>
      <Team side={game.away} dim={done && homeWon} />
      <View style={styles.mid}>
        {done ? (
          <Text style={styles.score}>{game.away.score}–{game.home.score}</Text>
        ) : (
          <Text style={styles.time}>{time}</Text>
        )}
        {showStage ? <CupBadge stage={game.stage} /> : null}
      </View>
      <Team side={game.home} right dim={done && !homeWon} />
    </Pressable>
  );
}

function Team({ side, right, dim }: { side: CupGame['home']; right?: boolean; dim?: boolean }) {
  return (
    <View style={[styles.team, right && { flexDirection: 'row-reverse' }, dim && { opacity: 0.5 }]}>
      {side.logo ? <Image source={side.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
      <Text style={styles.abbr}>{side.abbr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { ...textStyle.sectionLabel, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: surfaces.card,
  },
  mine: { borderColor: withAlpha(palette.chalk, 0.4), backgroundColor: surfaces.raised },
  team: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30 },
  abbr: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  mid: { alignItems: 'center', gap: 4, minWidth: 84 },
  score: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  time: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.muted },
});
