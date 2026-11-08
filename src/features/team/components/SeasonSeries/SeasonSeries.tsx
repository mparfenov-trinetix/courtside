import { Image } from 'expo-image';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import Animated from 'react-native-reanimated';

import type { Game, Team } from '@/lib/espn';
import { fonts, palette, surfaces, textStyle } from '@/lib/theme';
import { openDetail } from '@/navigation';

import { WIN, LOSS } from './constants';


/** How the viewed team has done against yours this season, with the next meeting if there is one. */
export function SeasonSeries({
  schedule,
  team,
  rival,
  accent,
}: {
  /** The viewed team's schedule. */
  schedule: Game[];
  team: Team;
  /** Your team: the one the series is measured against. */
  rival: Team;
  accent: string;
}) {
  const meetings = schedule
    .filter((g) => g.opponentAbbr === rival.abbreviation)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (meetings.length === 0) return null;

  const played = meetings.filter((g) => g.completed);
  const wins = played.filter((g) => g.result === 'W').length;
  const losses = played.filter((g) => g.result === 'L').length;
  const next = meetings.find((g) => !g.completed);

  const headline =
    played.length === 0
      ? 'No games played yet'
      : wins === losses
        ? `Tied ${wins}–${losses}`
        : `${wins > losses ? team.abbreviation : rival.abbreviation} leads ${Math.max(wins, losses)}–${Math.min(wins, losses)}`;

  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>Season series vs {rival.abbreviation}</Text>
      <View style={styles.card}>
        <View style={styles.top}>
          <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" />
          <Text style={[styles.headline, { color: accent }]}>{headline}</Text>
          <Image source={rival.logoDark || rival.logo} style={styles.logo} contentFit="contain" />
        </View>
        {meetings.map((g) => {
          const d = new Date(g.date);
          const when = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <Pressable
              key={g.id}
              onPress={() => openDetail({ pathname: '/game/[id]', params: { id: g.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
              <Text style={styles.date}>{when}</Text>
              <Text style={styles.place}>{g.home ? 'Home' : 'Away'}</Text>
              {g.completed && g.result ? (
                <Text style={[styles.result, { color: g.result === 'W' ? WIN : LOSS }]}>
                  {g.result} {g.teamScore}–{g.opponentScore}
                </Text>
              ) : (
                <Text style={[styles.result, { color: g === next ? palette.chalk : palette.muted }]}>
                  {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22, paddingHorizontal: 16 },
  title: { ...textStyle.sectionLabel, marginBottom: 8, paddingHorizontal: 4 },
  card: { borderRadius: 16, backgroundColor: surfaces.card, padding: 14, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 36, height: 36 },
  headline: { fontFamily: fonts.display, fontSize: 26 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  date: { width: 64, fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  place: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.muted },
  result: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
