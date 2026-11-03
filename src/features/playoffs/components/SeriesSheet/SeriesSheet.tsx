import { Image } from 'expo-image';
import { useRef } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sideScores } from '../SeriesCard';
import { ROUND_NAMES, type Series, type SeriesGame } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

const GOLD = '#FBBF24';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Results of one series, game by game. Tapping a game opens it. */
export function SeriesSheet({ series, onClose }: { series: Series | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  // Navigation waits for the sheet to finish dismissing, so the new screen isn't pushed under it.
  const pending = useRef<string | null>(null);
  const sc = series ? sideScores(series) : null;

  return (
    <Modal
      visible={series != null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={() => {
        if (pending.current) openDetail({ pathname: '/game/[id]', params: { id: pending.current } });
        pending.current = null;
      }}>
      <View style={styles.sheet}>
        {series && sc && (
          <>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.round}>{ROUND_NAMES[series.round]}{series.conference ? ` · ${series.conference === 'east' ? 'East' : 'West'}` : ''}</Text>
                <Text style={[styles.status, series.winnerId ? { color: GOLD } : null]}>{series.status}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>Done</Text>
              </Pressable>
            </View>

            <View style={styles.versus}>
              <View style={styles.team}>
                {series.top.logo ? <Image source={series.top.logo} style={styles.logo} contentFit="contain" /> : null}
                <Text style={styles.abbr}>{series.top.abbr}</Text>
                {series.top.seed ? <Text style={styles.seed}>#{series.top.seed} seed</Text> : null}
              </View>
              <Text style={styles.big}>
                {sc.top ?? 0}
                <Text style={{ color: palette.muted }}> – </Text>
                {sc.bottom ?? 0}
              </Text>
              <View style={[styles.team, { alignItems: 'flex-end' }]}>
                {series.bottom.logo ? <Image source={series.bottom.logo} style={styles.logo} contentFit="contain" /> : null}
                <Text style={styles.abbr}>{series.bottom.abbr}</Text>
                {series.bottom.seed ? <Text style={styles.seed}>#{series.bottom.seed} seed</Text> : null}
              </View>
            </View>

            <FlatList
              data={series.games}
              keyExtractor={(g) => g.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
              renderItem={({ item }) => (
                <GameRow
                  game={item}
                  onPress={() => {
                    pending.current = item.id;
                    onClose();
                  }}
                />
              )}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

function GameRow({ game, onPress }: { game: SeriesGame; onPress: () => void }) {
  const done = game.completed && game.home.score != null && game.away.score != null;
  const homeWon = done && game.home.score! > game.away.score!;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.game, pressed && { opacity: 0.7 }]}>
      <View style={{ width: 92 }}>
        <Text style={styles.gameLabel}>{game.label}</Text>
        <Text style={styles.gameDate}>{when(game.date)}</Text>
      </View>
      <View style={styles.matchup}>
        <Text style={[styles.gameAbbr, done && !homeWon && styles.won]}>{game.away.abbr}</Text>
        <Text style={styles.gameScore}>{done ? `${game.away.score}–${game.home.score}` : 'vs'}</Text>
        <Text style={[styles.gameAbbr, done && homeWon && styles.won]}>{game.home.abbr}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: palette.arena },
  head: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 8 },
  round: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: palette.muted },
  status: { fontFamily: fonts.display, fontSize: 30, color: palette.chalk, marginTop: 2 },
  close: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.muted },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  team: { alignItems: 'flex-start', gap: 2, width: 90 },
  logo: { width: 52, height: 52 },
  abbr: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  seed: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  big: { fontFamily: fonts.display, fontSize: 48, color: palette.chalk },
  game: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: 14, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  gameLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  gameDate: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  matchup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gameAbbr: { width: 48, fontFamily: fonts.bodySemi, fontSize: 16, color: palette.muted, textAlign: 'center' },
  won: { color: palette.chalk, fontFamily: fonts.bodyBold },
  gameScore: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
});
