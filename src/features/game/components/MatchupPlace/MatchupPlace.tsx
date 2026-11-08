import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Animated from 'react-native-reanimated';

import { ChevronIcon } from '@/components';

import { currentSeason, seasonOfDate, type GameKind } from '@/lib/espn';

import { PLAYOFFS_FROM } from '@/lib/league';

import { fonts, palette, surfaces, textStyle } from '@/lib/theme';
import { pushOnce } from '@/navigation';

import { MatchupStandings, StandingsLink } from '../MatchupStandings';


type Side = { id: string; abbr: string; color: string };

/** The first NBA Cup was played in 2023-24 (named 2024). */
const CUP_FROM = 2024;

/** What a game links to, from its kind: the table or bracket it is part of, or nothing. */
type Place =
  | { to: 'standings' }
  | { to: 'playoffs'; pane: 'playoffs' | 'playin'; title: string; line: string }
  | { to: 'cup'; view: 'groups' | 'knockout'; title: string; line: string };

function placeOf(kind: GameKind, season: number): Place | null {
  switch (kind) {
    case 'regular':
      return { to: 'standings' };
    case 'playoffs':
      // Before 2002-03 ESPN's playoff schedules have gaps: the bracket cannot be rebuilt (from 2002-03 the rounds are worked out, see `inferPlayoffNotes`).
      return season >= PLAYOFFS_FROM ? { to: 'playoffs', pane: 'playoffs', title: 'Playoffs', line: 'in the playoff bracket' } : null;
    case 'playin':
      return { to: 'playoffs', pane: 'playin', title: 'Play-In', line: 'in the play-in bracket' };
    case 'cup-group':
      return season >= CUP_FROM ? { to: 'cup', view: 'groups', title: 'NBA Cup', line: 'in the NBA Cup groups' } : null;
    case 'cup-knockout':
      return season >= CUP_FROM ? { to: 'cup', view: 'knockout', title: 'NBA Cup', line: 'in the NBA Cup bracket' } : null;
    // An All-Star or preseason game is in no table.
    default:
      return null;
  }
}

function open(place: Exclude<Place, { to: 'standings' }>, teams: string[], season: number) {
  Haptics.selectionAsync();
  // Pushed, not navigated: these screens live in the menu, and going there would leave the game behind the menu.
  pushOnce({
    pathname: (place.to === 'playoffs' ? '/matchup-playoffs' : '/matchup-cup') as never,
    params: { teams: teams.join(','), season: String(season), ...(place.to === 'playoffs' ? { pane: place.pane } : { view: place.view }) },
  });
}

/**
 * Where the game sits, by what kind of game it is. A regular-season game: the standings, as before. A playoff or play-in game: the
 * bracket of that season, opened on the series. A Cup game: the Cup's groups or knockout bracket of that season. An All-Star or
 * preseason game: nothing, since no table has it. `variant` is the full card (a game that has not started) or the slim row (one that has).
 */
export function MatchupPlace({
  kind,
  season,
  note,
  away,
  home,
  date,
  variant,
}: {
  kind: GameKind;
  season?: number;
  /** ESPN's note for the game ("West Finals - Game 2"). */
  note?: string;
  away: Side;
  home: Side;
  date?: string;
  variant: 'card' | 'link';
}) {
  const year = season ?? (date ? seasonOfDate(date) : currentSeason());
  const place = placeOf(kind, year);
  if (!place) return null;
  if (place.to === 'standings') {
    return variant === 'card' ? <MatchupStandings away={away} home={home} date={date} /> : <StandingsLink away={away} home={home} date={date} />;
  }
  const teams = [away.id, home.id];
  if (variant === 'link') {
    return (
      <Pressable
        onPress={() => open(place, teams, year)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${away.abbr} and ${home.abbr} ${place.line}`}
        style={({ pressed }) => [styles.slim, pressed && { opacity: 0.7 }]}>
        <Text style={styles.slimText}>
          {away.abbr} and {home.abbr} {place.line}
        </Text>
        <ChevronIcon color={palette.muted} size={14} />
      </Pressable>
    );
  }
  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>{place.title}</Text>
      <Pressable
        onPress={() => open(place, teams, year)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${away.abbr} and ${home.abbr} ${place.line}`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
        <View style={styles.cardText}>
          <Text style={styles.stage}>{note ?? place.title}</Text>
          <Text style={styles.sub}>
            {away.abbr} and {home.abbr} {place.line}
          </Text>
        </View>
        <ChevronIcon color={palette.muted} size={14} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { ...textStyle.sectionLabel, marginBottom: 8, paddingHorizontal: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: surfaces.card, paddingHorizontal: 16, paddingVertical: 14 },
  cardText: { flex: 1, gap: 2 },
  stage: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 13, color: palette.muted },
  slim: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: surfaces.card,
  },
  slimText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
});
