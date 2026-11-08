import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components';
import type { AllStarGame, AllStarTeam } from '@/lib/espn';
import { fontSize, fonts, palette, space, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

/** The game or games of the day (a mini tournament has three), each a scoreboard row that opens the game page. */
export function AllStarGames({ games }: { games: AllStarGame[] }) {
  if (games.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <SectionLabel style={styles.label}>{games.length > 1 ? 'Games' : 'The game'}</SectionLabel>
      {games.map((g) => (
        <GameRow key={g.id} game={g} />
      ))}
    </View>
  );
}

function GameRow({ game }: { game: AllStarGame }) {
  const [a, b] = game.teams;
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${game.round}: ${a.name} ${a.score}, ${b.name} ${b.score}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Card style={styles.row}>
        <Text style={styles.round}>{game.round}</Text>
        {game.rule ? <Text style={styles.rule}>{game.rule}</Text> : null}
        <View style={styles.sides}>
          <Side team={a} final={game.final} />
          <Text style={styles.dash}>{game.final ? '–' : 'vs'}</Text>
          <Side team={b} final={game.final} right />
        </View>
      </Card>
    </Pressable>
  );
}

function Side({ team, final, right }: { team: AllStarTeam; final: boolean; right?: boolean }) {
  const dim = final && !team.winner;
  return (
    <View style={[styles.side, right && { flexDirection: 'row-reverse' }]}>
      {/* On a light disc: the East, West, World and USA marks are dark and vanish on the dark card. */}
      <View style={styles.badge}>{team.logo ? <Image source={team.logo} style={styles.logo} contentFit="contain" /> : null}</View>
      <View style={[{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }, dim && { opacity: 0.55 }]}>
        <Text style={styles.name} numberOfLines={1}>{team.name}</Text>
        {final ? <Text style={[styles.score, team.winner && { color: palette.gold }]}>{team.score}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.sm },
  label: { paddingHorizontal: space.xs },
  row: { gap: space.xs },
  round: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  rule: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted },
  sides: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: withAlpha('#FFFFFF', 0.94), alignItems: 'center', justifyContent: 'center' },
  logo: { width: 34, height: 34 },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  score: { fontFamily: fonts.display, fontSize: fontSize.hero - 8, lineHeight: 42, color: palette.chalk },
  dash: { fontFamily: fonts.bodySemi, fontSize: fontSize.body, color: palette.muted },
});
