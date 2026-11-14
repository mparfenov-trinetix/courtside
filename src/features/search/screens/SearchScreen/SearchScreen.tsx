import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, SearchIcon, SearchInput } from '@/components';
import { usePlayerSearch, useTeams } from '@/hooks';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { goBack, openDetail } from '@/navigation';
import { RECENT_KEY, MAX_RECENT } from './constants';
import { READABLE } from '@/lib/layout';

type Hit =
  | { kind: 'team'; id: string; title: string; subtitle: string; image?: string }
  | { kind: 'player'; id: string; title: string; subtitle: string; image?: string; teamId?: string };

function open(hit: Hit) {
  if (hit.kind === 'team') openDetail(`/team/${hit.id}` as Href);
  else openDetail({ pathname: '/player/[id]', params: { id: hit.id, teamId: hit.teamId ?? '' } });
}

/** One box for teams and players, with the last few things you opened when it's empty. */
export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<Hit[]>([]);
  const { data: teams } = useTeams();
  const { data: players, isFetching, isError } = usePlayerSearch(query);

  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => raw && setRecent(JSON.parse(raw) as Hit[]))
      .catch(() => {});
  }, []);

  // The new order is saved at once but not shown at once: the list is still on screen while the page you picked slides in, and the
  // picked row jumping to the top in that moment looked like a glitch. It is applied when the screen is covered.
  const pending = useRef<Hit[] | null>(null);
  const remember = (hit: Hit) => {
    const base = pending.current ?? recent;
    const next = [hit, ...base.filter((r) => !(r.kind === hit.kind && r.id === hit.id))].slice(0, MAX_RECENT);
    pending.current = next;
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  };
  useFocusEffect(
    useCallback(
      () => () => {
        // Blur comes as the page starts to slide in: wait for the slide to finish (about 400 ms) before the list changes under it.
        setTimeout(() => {
          if (!pending.current) return;
          setRecent(pending.current);
          pending.current = null;
        }, 800);
      },
      [],
    ),
  );

  const clearRecent = () => {
    pending.current = null;
    setRecent([]);
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  };

  const q = query.toLowerCase();
  const teamHits: Hit[] =
    q.length >= 2
      ? (teams ?? [])
          .filter((t) => [t.displayName, t.abbreviation, t.location, t.name].some((s) => s?.toLowerCase().includes(q)))
          .slice(0, 5)
          .map((t) => ({ kind: 'team', id: t.id, title: t.displayName, subtitle: t.abbreviation, image: t.logoDark || t.logo }))
      : [];
  const playerHits: Hit[] =
    q.length >= 2
      ? (players ?? []).map((p) => ({
          kind: 'player',
          id: p.id,
          title: p.name,
          subtitle: p.teamAbbr ?? '',
          image: p.headshot,
          teamId: p.teamId,
        }))
      : [];

  const searching = q.length >= 2;
  const sections = searching
    ? [
        { title: 'Teams', data: teamHits },
        { title: 'Players', data: playerHits },
      ].filter((s) => s.data.length > 0)
    : recent.length > 0
      ? [{ title: 'Recent', data: recent }]
      : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <Glass style={styles.field} fallbackStyle={styles.fieldPlain}>
          <SearchIcon color={palette.muted} size={18} />
          <SearchInput
            bare
            value={text}
            onChangeText={setText}
            placeholder="Search players and teams"
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={{ flex: 1 }}
          />
          {isFetching && <ActivityIndicator color={palette.muted} size="small" />}
        </Glass>
        <Pressable accessibilityRole="button" onPress={goBack} hitSlop={10}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(h) => `${h.kind}-${h.id}`}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[READABLE, { paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {searching ? (isFetching ? ' ' : isError ? 'Couldn’t search players. Teams are still listed when they match.' : 'No players or teams found') : 'Type at least two letters.'}
          </Text>
        }
        renderSectionHeader={({ section }) =>
          section.title === 'Recent' ? (
            <View style={styles.sectionRow}>
              <Text style={[styles.section, styles.sectionRowTitle]}>{section.title}</Text>
              <Pressable onPress={clearRecent} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear recent searches">
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.section}>{section.title}</Text>
          )
        }
        renderItem={({ item }) => (
          <Animated.View>
            <Pressable
              onPress={() => {
                remember(item);
                open(item);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: surfaces.card }]}>
              <View style={[styles.avatar, item.kind === 'team' && styles.avatarTeam]}>
                {item.image ? (
                  <Image
                    source={item.image}
                    style={item.kind === 'team' ? styles.logo : styles.headshot}
                    contentFit={item.kind === 'team' ? 'contain' : 'cover'}
                    // The photo is wider than tall: crop its sides evenly and keep the top, where the face is.
                    contentPosition="top"
                  />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sub}>{item.kind === 'team' ? 'Team' : item.subtitle || 'Player'}</Text>
              </View>
              <Text style={styles.kind}>{item.kind === 'team' ? item.subtitle : item.subtitle ? 'Player' : ''}</Text>
            </Pressable>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
  },
  fieldPlain: { backgroundColor: surfaces.raised },
  cancel: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionRowTitle: { flex: 1 },
  clear: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted, paddingBottom: 6, paddingHorizontal: 4 },
  section: { ...textStyle.sectionLabel, paddingTop: 16, paddingBottom: 6, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(palette.chalk, 0.1) },
  avatarTeam: { backgroundColor: 'transparent', borderRadius: 0 },
  headshot: { width: 44, height: 44 },
  logo: { width: 44, height: 44 },
  title: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 1 },
  kind: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  empty: { textAlign: 'center', marginTop: 40, fontFamily: fonts.body, fontSize: 15, color: palette.muted },
});
